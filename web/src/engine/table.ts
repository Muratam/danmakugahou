// 値の表（多重集合の番号 → 値）と、表から表を作る 3 つの演算。
// 表はサイズの範囲 [lo, hi] の多重集合だけを持つ（番号 off[lo] .. off[hi+1]-1 が連続しているので配列 1 本）。
//
// 演算（t は「その多重集合から先の最善の値」の表）:
//   R(t)(S) = (1/6) Σ_v t(S+v)       … ダイスを 1 個振って足す（期待値）
//   A(t)(S) = max_v t(S+v)           … 好きな目のダイスを 1 個足す
//   C(t)(S) = max(t(S), max_{d∈S} A(t)(S-d)) … ダイス 1 個の目を好きな値に変える（変えなくてもよい）
// 能力の「後の手順」は演算の列（文字列）で表す。左の文字から順に時間が進む: "RC" = 1 個振って足し、その後 1 個を好きな目に変える。
// 値は kind を右から順に掛けた表で引く: "RC" → R(C(t))。
import { MAXD, addT, off, remT } from "./multiset";

export class Table {
  readonly lo: number;
  readonly hi: number;
  readonly base: number;
  readonly data: Float64Array;
  constructor(lo: number, hi: number) {
    this.lo = Math.max(0, lo);
    this.hi = Math.min(MAXD, hi);
    this.base = off[this.lo];
    this.data = new Float64Array(this.hi >= this.lo ? off[this.hi + 1] - off[this.lo] : 0);
  }
  get empty(): boolean {
    return this.hi < this.lo;
  }
  has(i: number): boolean {
    return i >= this.base && i < this.base + this.data.length;
  }
  get(i: number): number {
    return this.data[i - this.base];
  }
}

export function opR(t: Table): Table {
  const out = new Table(t.lo - 1, t.hi - 1);
  if (out.empty) return out;
  const d = t.data;
  const b = t.base;
  const o = out.data;
  for (let i = out.base, j = 0; j < o.length; i++, j++) {
    const a = i * 6;
    o[j] = (d[addT[a] - b] + d[addT[a + 1] - b] + d[addT[a + 2] - b] + d[addT[a + 3] - b] + d[addT[a + 4] - b] + d[addT[a + 5] - b]) / 6;
  }
  return out;
}

export function opA(t: Table): Table {
  const out = new Table(t.lo - 1, t.hi - 1);
  if (out.empty) return out;
  const d = t.data;
  const b = t.base;
  const o = out.data;
  for (let i = out.base, j = 0; j < o.length; i++, j++) {
    const a = i * 6;
    let m = d[addT[a] - b];
    for (let v = 1; v < 6; v++) {
      const x = d[addT[a + v] - b];
      if (x > m) m = x;
    }
    o[j] = m;
  }
  return out;
}

/** C(t)。at は A(t)（呼ぶ側で共有する） */
export function opC(t: Table, at: Table): Table {
  const out = new Table(t.lo, t.hi);
  const o = out.data;
  o.set(t.data);
  if (at.empty) return out;
  const ab = at.base;
  for (let i = out.base, j = 0; j < o.length; i++, j++) {
    let m = o[j];
    for (let v = 0; v < 6; v++) {
      const r = remT[i * 6 + v];
      if (r < 0) continue;
      const x = at.data[r - ab];
      if (x > m) m = x;
    }
    o[j] = m;
  }
  return out;
}

/** 表 v から kind の表を作る（cache に途中の表も入れる） */
export function derive(v: Table, kind: string, cache: Map<string, Table>): Table {
  if (kind === "") return v;
  const hit = cache.get(kind);
  if (hit) return hit;
  const rest = kind.slice(1);
  const inner = derive(v, rest, cache);
  let out: Table;
  switch (kind[0]) {
    case "R":
      out = opR(inner);
      break;
    case "A":
      out = opA(inner);
      break;
    case "C":
      out = opC(inner, derive(v, "A" + rest, cache));
      break;
    default:
      throw new Error(`unknown op ${kind}`);
  }
  cache.set(kind, out);
  return out;
}
