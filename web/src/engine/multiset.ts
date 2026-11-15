// ダイスの目の多重集合（0〜13 個）に通し番号を付け、1 個足す・1 個除く の隣接表を持つ。
// 番号はサイズの小さい順（同じサイズの中は個数の辞書順）。サイズ s の番号は off[s] .. off[s+1]-1。
// 目は 1〜6。配列の添字は 0〜5（目 v は添字 v-1）。

/** 扱うダイスの最大の個数。撮影はレベル 8 + 増やす能力の合計 5（美鈴・衣玖・小町 +1、神奈子 +2）で 13、編集は 8 + 5 で 13 */
export const MAXD = 13;

function build() {
  const lists: number[][][] = [];
  for (let s = 0; s <= MAXD; s++) {
    const out: number[][] = [];
    const c = [0, 0, 0, 0, 0, 0];
    const rec = (k: number, rest: number) => {
      if (k === 5) {
        c[5] = rest;
        out.push(c.slice());
        return;
      }
      for (let x = rest; x >= 0; x--) {
        c[k] = x;
        rec(k + 1, rest - x);
      }
    };
    rec(0, s);
    lists.push(out);
  }
  const off = new Int32Array(MAXD + 2);
  let n = 0;
  for (let s = 0; s <= MAXD; s++) {
    off[s] = n;
    n += lists[s].length;
  }
  off[MAXD + 1] = n;
  const cnt = new Uint8Array(n * 6);
  const size = new Uint8Array(n);
  const keyToIdx = new Map<number, number>();
  const key = (c: ArrayLike<number>) => ((((c[0] * 14 + c[1]) * 14 + c[2]) * 14 + c[3]) * 14 + c[4]) * 14 + c[5];
  let i = 0;
  for (let s = 0; s <= MAXD; s++) {
    for (const c of lists[s]) {
      cnt.set(c, i * 6);
      size[i] = s;
      keyToIdx.set(key(c), i);
      i++;
    }
  }
  const add = new Int32Array(n * 6).fill(-1);
  const rem = new Int32Array(n * 6).fill(-1);
  const c = [0, 0, 0, 0, 0, 0];
  for (let j = 0; j < n; j++) {
    for (let v = 0; v < 6; v++) {
      for (let k = 0; k < 6; k++) c[k] = cnt[j * 6 + k];
      if (size[j] < MAXD) {
        c[v]++;
        add[j * 6 + v] = keyToIdx.get(key(c))!;
        c[v]--;
      }
      if (c[v] > 0) {
        c[v]--;
        rem[j * 6 + v] = keyToIdx.get(key(c))!;
      }
    }
  }
  // サイズ s のダイスを振ったときにその多重集合になる確率（多項分布）
  const fact = [1];
  for (let k = 1; k <= MAXD; k++) fact.push(fact[k - 1] * k);
  const prob = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    let p = fact[size[j]];
    for (let k = 0; k < 6; k++) p /= fact[cnt[j * 6 + k]];
    prob[j] = p / 6 ** size[j];
  }
  return { n, off, cnt, size, add, rem, prob };
}

const built = build();
/** 多重集合の総数（C(19,6) = 27132） */
export const N = built.n;
/** off[s]: サイズ s の最初の番号。off[MAXD+1] = N */
export const off = built.off;
/** cnt[i*6+k]: 番号 i の多重集合の、目 k+1 の個数 */
export const cnt = built.cnt;
export const size = built.size;
/** add[i*6+k]: 目 k+1 を 1 個足した番号（13 個のときは -1） */
export const addT = built.add;
/** rem[i*6+k]: 目 k+1 を 1 個除いた番号（無いときは -1） */
export const remT = built.rem;
/** サイズ size[i] 個を振ってこの多重集合になる確率 */
export const rollProb = built.prob;

/** 個数の配列（長さ 6）から番号 */
export function indexOfCounts(c: ArrayLike<number>): number {
  let i = 0;
  for (let k = 0; k < 6; k++) for (let x = 0; x < c[k]; x++) i = addT[i * 6 + k];
  return i;
}

/** 目の列（1〜6）から番号 */
export function indexOfDice(dice: readonly number[]): number {
  let i = 0;
  for (const d of dice) i = addT[i * 6 + d - 1];
  return i;
}

/** 番号から個数の配列（長さ 6） */
export function countsOf(i: number): number[] {
  return Array.from(cnt.subarray(i * 6, i * 6 + 6));
}

/** 番号から目の列（小さい順） */
export function diceOf(i: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < 6; k++) for (let x = 0; x < cnt[i * 6 + k]; x++) out.push(k + 1);
  return out;
}

/** 番号 i から、目の列 removes を除き adds を足した番号（除けないとき・13 個を超えるときは -1） */
export function moveIdx(i: number, removes: readonly number[], adds: readonly number[]): number {
  for (const r of removes) {
    if (i < 0) return -1;
    i = remT[i * 6 + r - 1];
  }
  for (const a of adds) {
    if (i < 0) return -1;
    i = addT[i * 6 + a - 1];
  }
  return i;
}
