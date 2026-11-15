// 層 DP（src/engine/solver.ts）を確かめるための素朴な全探索。
// ダイスの列（小さい順の文字列）・残りの能力・ヘルプの枚数・能力の途中の手順をキーにしてメモ化する再帰。
// 表・番号・隣接表を使わず、能力の選択肢（charas.ts の gen）だけを共有する。
import { CHARA_BY_ID, editScore, type Chara, type Rules } from "../src/engine/charas";

type Dice = number[];
const key = (d: Dice) => d.join("");
const counts7 = (d: Dice) => {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const x of d) c[x]++;
  return c;
};
const sorted = (d: Dice) => [...d].sort((a, b) => a - b);
function apply(d: Dice, removes: number[], adds: number[]): Dice | null {
  const out = [...d];
  for (const r of removes) {
    const k = out.indexOf(r);
    if (k < 0) return null;
    out.splice(k, 1);
  }
  out.push(...adds);
  if (out.length > 13) return null;
  return sorted(out);
}

export class Brute {
  private memo = new Map<string, number>();
  private charas: Chara[];
  constructor(
    private rules: Rules,
    charaIds: string[],
    private goal: (d: Dice, U: number) => number,
  ) {
    this.charas = charaIds.map((id) => CHARA_BY_ID.get(id)!);
  }

  value(d: Dice, U: number, h: number, ops = ""): number {
    const k = `${key(d)}|${U}|${h}|${ops}`;
    const hit = this.memo.get(k);
    if (hit !== undefined) return hit;
    let best: number;
    if (ops) {
      const rest = ops.slice(1);
      if (ops[0] === "R" || ops[0] === "A") {
        const xs = [1, 2, 3, 4, 5, 6].map((v) => this.value(sorted([...d, v]), U, h, rest));
        best = ops[0] === "R" ? xs.reduce((a, b) => a + b, 0) / 6 : Math.max(...xs);
      } else {
        best = this.value(d, U, h, rest);
        for (const a of new Set(d))
          for (let b = 1; b <= 6; b++) best = Math.max(best, this.value(apply(d, [a], [b])!, U, h, rest));
      }
    } else {
      best = this.goal(d, U);
      this.charas.forEach((ch, i) => {
        if (!(U & (1 << i))) return;
        ch.gen(counts7(d), (kind, removes, adds) => {
          const d2 = apply(d, removes, adds);
          if (!d2) return;
          best = Math.max(best, this.value(d2, U & ~(1 << i), h, kind));
        }, this.rules);
      });
      if (h > 0)
        for (const a of new Set(d)) {
          let s = 0;
          for (let v = 1; v <= 6; v++) s += this.value(apply(d, [a], [v])!, U, h - 1);
          best = Math.max(best, s / 6);
        }
    }
    this.memo.set(k, best);
    return best;
  }

  /** L 個を振ってからの期待値（小さい順の列を数え、並べ方の数 L!/Πc! を掛ける） */
  expected(L: number, U: number, h: number): number {
    const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
    let s = 0;
    const rec = (d: Dice, from: number) => {
      if (d.length === L) {
        const c = counts7(d);
        const ways = fact(L) / c.reduce((a, x) => a * fact(x), 1);
        s += ways * this.value(d, U, h);
        return;
      }
      for (let v = from; v <= 6; v++) rec([...d, v], v);
    };
    rec([], 1);
    return s / 6 ** L;
  }
}

export function bruteCapture(rules: Rules, L: number, held: string[], H: number, targets: string[]): number {
  const conds = targets.map((t) => CHARA_BY_ID.get(t)!);
  const b = new Brute(rules, held, (d) => (conds.some((c) => c.cond(counts7(d), rules)) ? 1 : 0));
  return b.expected(L, (1 << held.length) - 1, H);
}

export function bruteEdit(rules: Rules, held: string[]): number {
  const back = new Brute(rules, held, (d) => editScore(counts7(d)));
  const B = new Map<number, number>();
  const full = (1 << held.length) - 1;
  for (let U = 0; U <= full; U++) B.set(U, back.expected(8, U, 0));
  const front = new Brute(rules, held, (d, U) => editScore(counts7(d)) + B.get(U)!);
  return front.expected(8, full, 0);
}
