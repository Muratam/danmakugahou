// 撮影・編集の問題を LayerDP に組み立てる。
import { CHARAS, CHARA_BY_ID, editScore, type Rules } from "./charas";
import { N, cnt } from "./multiset";
import { LayerDP } from "./solver";

/** 撮影条件の表（どれか 1 人でも満たせば 1） */
export function okTable(rules: Rules, targetIds: string[]): Uint8Array {
  const conds = targetIds.map((id) => {
    const c = CHARA_BY_ID.get(id);
    if (!c) throw new Error(`unknown chara ${id}`);
    return c;
  });
  const ok = new Uint8Array(N);
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 6; k++) c[k + 1] = cnt[i * 6 + k];
    ok[i] = conds.some((ch) => ch.cond(c, rules)) ? 1 : 0;
  }
  return ok;
}

/** 撮影: レベル level のダイスを振り、held の能力と help 枚のヘルプで targets のどれかの条件を満たす確率 */
export function solveCapture(rules: Rules, level: number, held: string[], help: number, targets: string[], onProgress?: (d: number, t: number) => void): LayerDP {
  const ok = okTable(rules, targets);
  return new LayerDP(rules, level, held, help, (_U, i) => ok[i]).solve(onProgress);
}

const scoreTable = (() => {
  const s = new Float64Array(N);
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 6; k++) c[k + 1] = cnt[i * 6 + k];
    s[i] = editScore(c);
  }
  return s;
})();

export interface EditSolution {
  /** 一面（二面に残す能力の値を含む） */
  front: LayerDP;
  /** 二面だけ */
  back: LayerDP;
  /** back2[U]: 能力 U が残っているときの二面の評価点の期待値 */
  backValue: Float64Array;
}

/** 編集: ダイス 8 個、ヘルプなし。一面で使った能力は二面で使えない。一面と二面の合計の期待値を最大にする */
export function solveEdit(rules: Rules, held: string[], onProgress?: (d: number, t: number) => void): EditSolution {
  const back = new LayerDP(rules, 8, held, 0, (_U, i) => scoreTable[i], true).solve(onProgress);
  const backValue = new Float64Array(back.full + 1);
  for (let U = 0; U <= back.full; U++) backValue[U] = back.expected(U, 0);
  const front = new LayerDP(rules, 8, held, 0, (U, i) => scoreTable[i] + backValue[U]).solve(onProgress);
  return { front, back, backValue };
}

export { scoreTable };

export interface SkillTableRow {
  /** 能力を使うキャラの id */
  user: string;
  /** そのレベルの各被写体の成功確率（0〜1。charasOfLevel の順） */
  probs: number[];
  /** そのレベルのいずれか */
  any: number;
}

/**
 * 能力 1 つ（1 回）だけで、各レベルの被写体を撮れる確率の表（per.txt と同じ形）。
 * 行 = 能力を使うキャラ（36 人）、列 = レベルの各被写体と「いずれか」。help はヘルプの枚数
 */
export function singleSkillTable(rules: Rules, level: number, help = 0): SkillTableRow[] {
  const targets = CHARAS.filter((c) => c.level === level).map((c) => c.id);
  return CHARAS.map((user) => ({
    user: user.id,
    probs: targets.map((t) => solveCapture(rules, level, [user.id], help, [t]).expected()),
    any: solveCapture(rules, level, [user.id], help, targets).expected(),
  }));
}
