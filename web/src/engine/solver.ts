// 層ごとの後ろ向き DP。
// 層 = (U: まだ使っていない能力の集合, h: 残りのヘルプの枚数)。値 V[U][h](S) は多重集合 S から最善に操作したときの値
// （撮影なら成功確率、編集なら評価点の期待値）。
//   V[U][h](S) = max( goal(U, S),
//                     c ∈ U の各選択肢の値（子の層 U\{c}, h の表を kind で引く）,
//                     h > 0 なら ダイス 1 個の振り直し（子の層 U, h-1） )
// U の要素の少ない順に層をまるごと計算する。近似は無い。
import { CHARA_BY_ID, labelOf, type Chara, type Rules } from "./charas";
import { MAXD, N, cnt, countsOf, moveIdx, off, remT, rollProb } from "./multiset";
import { Table, derive } from "./table";

/** 能力の選択肢を多重集合のサイズごとにまとめた表 */
interface Compiled {
  kinds: string[];
  /** start[j]..start[j+1]-1 が、サイズ s の j 番目の多重集合の選択肢 */
  start: Int32Array;
  kindIdx: Uint8Array;
  target: Int32Array;
}

const compiledCache = new Map<string, Compiled>();
const c7 = [0, 0, 0, 0, 0, 0, 0];

function countsOf7(i: number): number[] {
  for (let k = 0; k < 6; k++) c7[k + 1] = cnt[i * 6 + k];
  return c7;
}

export function compile(ch: Chara, rules: Rules, s: number): Compiled {
  const key = `${ch.id}|${rules}|${s}`;
  const hit = compiledCache.get(key);
  if (hit) return hit;
  const kinds: string[] = [];
  const kindMap = new Map<string, number>();
  const n = off[s + 1] - off[s];
  const start = new Int32Array(n + 1);
  const ks: number[] = [];
  const ts: number[] = [];
  const seen = new Set<number>();
  for (let j = 0; j < n; j++) {
    const i = off[s] + j;
    start[j] = ts.length;
    seen.clear();
    ch.gen(countsOf7(i), (kind, removes, adds) => {
      const t = moveIdx(i, removes, adds);
      if (t < 0) return;
      let k = kindMap.get(kind);
      if (k === undefined) {
        k = kinds.length;
        kinds.push(kind);
        kindMap.set(kind, k);
      }
      const sk = k * N + t;
      if (seen.has(sk)) return;
      seen.add(sk);
      ks.push(k);
      ts.push(t);
    }, rules);
  }
  start[n] = ts.length;
  const out: Compiled = { kinds, start, kindIdx: Uint8Array.from(ks), target: Int32Array.from(ts) };
  compiledCache.set(key, out);
  return out;
}

export type GoalFn = (U: number, i: number) => number;

export interface SolveStats {
  layers: number;
  states: number;
  options: number;
  ms: number;
}

export class LayerDP {
  readonly rules: Rules;
  readonly L: number;
  readonly charas: Chara[];
  readonly H: number;
  readonly goal: GoalFn;
  readonly full: number;
  private V: Table[] = [];
  private caches: Map<string, Table>[] = [];
  stats: SolveStats = { layers: 0, states: 0, options: 0, ms: 0 };

  /** true: どの層からでも L 個で始められるように、層の個数の範囲を広げる（編集の二面。使っていない能力の組ごとに L 個から始める） */
  readonly anyStart: boolean;

  constructor(rules: Rules, L: number, charaIds: string[], H: number, goal: GoalFn, anyStart = false) {
    this.rules = rules;
    this.anyStart = anyStart;
    this.L = L;
    this.charas = charaIds.map((id) => {
      const c = CHARA_BY_ID.get(id);
      if (!c) throw new Error(`unknown chara ${id}`);
      return c;
    });
    this.H = H;
    this.goal = goal;
    this.full = (1 << this.charas.length) - 1;
  }

  /** 層 U のダイスの個数の範囲 */
  range(U: number): [number, number] {
    let lo = this.L;
    let hi = this.L;
    this.charas.forEach((c, k) => {
      if (U & (1 << k)) return;
      const [a, b] = c.delta(this.rules);
      lo += this.anyStart ? Math.min(0, a) : a;
      hi += this.anyStart ? Math.max(0, b) : b;
    });
    return [Math.max(0, lo), Math.min(MAXD, hi)];
  }

  private lid(U: number, h: number) {
    return U * (this.H + 1) + h;
  }

  layer(U: number, h: number): Table {
    return this.V[this.lid(U, h)];
  }

  /** 層の表から kind の表（途中の表はその層の cache に置く） */
  derived(U: number, h: number, kind: string): Table {
    const id = this.lid(U, h);
    let cache = this.caches[id];
    if (!cache) cache = this.caches[id] = new Map();
    return derive(this.V[id], kind, cache);
  }

  solve(onProgress?: (done: number, total: number) => void): this {
    const t0 = performance.now();
    const n = this.charas.length;
    const masks: number[] = [];
    for (let U = 0; U <= this.full; U++) masks.push(U);
    const pop = (x: number) => {
      let k = 0;
      for (; x; x &= x - 1) k++;
      return k;
    };
    masks.sort((a, b) => pop(a) - pop(b) || a - b);
    let states = 0;
    let options = 0;
    let curPop = 0;
    for (let mi = 0; mi < masks.length; mi++) {
      const U = masks[mi];
      const p = pop(U);
      if (p !== curPop) {
        // 2 つ下の層の途中の表は、もう使わない（後で問い合わせるときは作り直す）
        for (const W of masks) if (pop(W) === curPop - 1) for (let h = 0; h <= this.H; h++) delete this.caches[this.lid(W, h)];
        curPop = p;
      }
      const [lo, hi] = this.range(U);
      for (let h = 0; h <= this.H; h++) {
        const t = new Table(lo, hi);
        const d = t.data;
        for (let j = 0; j < d.length; j++) d[j] = this.goal(U, t.base + j);
        states += d.length;
        for (let k = 0; k < n; k++) {
          if (!(U & (1 << k))) continue;
          const child = U & ~(1 << k);
          const ch = this.charas[k];
          for (let s = t.lo; s <= t.hi; s++) {
            const comp = compile(ch, this.rules, s);
            if (comp.target.length === 0) continue;
            options += comp.target.length;
            const tabs = comp.kinds.map((kind) => this.derived(child, h, kind));
            const st = comp.start;
            const ki = comp.kindIdx;
            const tg = comp.target;
            const o0 = off[s] - t.base;
            const ns = off[s + 1] - off[s];
            for (let j = 0; j < ns; j++) {
              let m = d[o0 + j];
              for (let q = st[j]; q < st[j + 1]; q++) {
                const tb = tabs[ki[q]];
                const x = tb.data[tg[q] - tb.base];
                if (x > m) m = x;
              }
              d[o0 + j] = m;
            }
          }
        }
        if (h > 0) {
          // ヘルプ: ダイス 1 個を振り直す = 1 個除いて R
          const r = this.derived(U, h - 1, "R");
          if (!r.empty) {
            for (let j = 0; j < d.length; j++) {
              const i = t.base + j;
              let m = d[j];
              for (let v = 0; v < 6; v++) {
                const ri = remT[i * 6 + v];
                if (ri < 0) continue;
                const y = r.data[ri - r.base];
                if (y > m) m = y;
              }
              d[j] = m;
            }
          }
        }
        this.V[this.lid(U, h)] = t;
      }
      onProgress?.(mi + 1, masks.length);
    }
    this.stats = { layers: masks.length * (this.H + 1), states, options, ms: performance.now() - t0 };
    return this;
  }

  /** 最初に L 個振ってからの値（期待値） */
  expected(U = this.full, h = this.H): number {
    const t = this.layer(U, h);
    let e = 0;
    for (let i = off[this.L]; i < off[this.L + 1]; i++) e += rollProb[i] * t.get(i);
    return e;
  }

  /** 状態の値。ops は能力の途中（振った後の選択など）の残りの手順 */
  value(U: number, h: number, i: number, ops = ""): number {
    const t = ops ? this.derived(U, h, ops) : this.layer(U, h);
    return t.has(i) ? t.get(i) : NaN;
  }

  /** 状態 (U, h, i) で取れる行動と、それぞれの値（大きい順） */
  actions(U: number, h: number, i: number): ActionGroup[] {
    const groups: ActionGroup[] = [];
    groups.push({ who: "stop", options: [{ kind: "", removes: [], adds: [], label: "ここで確定", value: this.goal(U, i), childU: U, childH: h }] });
    this.charas.forEach((ch, k) => {
      if (!(U & (1 << k))) return;
      const child = U & ~(1 << k);
      const opts: ActionOption[] = [];
      const seen = new Set<string>();
      ch.gen([0, ...countsOf(i)], (kind, removes, adds) => {
        const t = moveIdx(i, removes, adds);
        if (t < 0) return;
        const key = `${kind}|${t}`;
        if (seen.has(key)) return;
        seen.add(key);
        opts.push({ kind, removes, adds, label: labelOf(ch, kind, removes, adds, this.rules), value: this.value(child, h, t, kind), childU: child, childH: h });
      }, this.rules);
      opts.sort((a, b) => b.value - a.value);
      groups.push({ who: ch.id, options: opts });
    });
    if (h > 0) {
      const opts: ActionOption[] = [];
      for (let v = 1; v <= 6; v++) {
        if (cnt[i * 6 + v - 1] === 0) continue;
        const t = moveIdx(i, [v], []);
        opts.push({ kind: "R", removes: [v], adds: [], label: `${v} を振り直す`, value: this.value(U, h - 1, t, "R"), childU: U, childH: h - 1 });
      }
      opts.sort((a, b) => b.value - a.value);
      groups.push({ who: "help", options: opts });
    }
    return groups;
  }

  /** 能力の途中（ops の先頭が A か C）で選べるもの。ops の先頭が R のときは振るだけなので空 */
  pendingOptions(U: number, h: number, i: number, ops: string): ActionOption[] {
    const rest = ops.slice(1);
    const out: ActionOption[] = [];
    if (ops[0] === "A") {
      for (let v = 1; v <= 6; v++) {
        const t = moveIdx(i, [], [v]);
        if (t >= 0) out.push({ kind: rest, removes: [], adds: [v], label: `${v} を足す`, value: this.value(U, h, t, rest), childU: U, childH: h });
      }
    } else if (ops[0] === "C") {
      out.push({ kind: rest, removes: [], adds: [], label: "変えない", value: this.value(U, h, i, rest), childU: U, childH: h });
      for (let a = 1; a <= 6; a++) {
        if (cnt[i * 6 + a - 1] === 0) continue;
        for (let b = 1; b <= 6; b++) {
          if (b === a) continue;
          const t = moveIdx(i, [a], [b]);
          out.push({ kind: rest, removes: [a], adds: [b], label: `${a} を ${b} に`, value: this.value(U, h, t, rest), childU: U, childH: h });
        }
      }
    }
    out.sort((a, b) => b.value - a.value);
    return out;
  }
}

export interface ActionOption {
  kind: string;
  removes: number[];
  adds: number[];
  label: string;
  value: number;
  /** この選択の後の層 */
  childU: number;
  childH: number;
}

export interface ActionGroup {
  /** "stop"・"help"・キャラの id */
  who: string;
  options: ActionOption[];
}
