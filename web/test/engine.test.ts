// 層 DP と素朴な全探索（test/brute.ts）の一致、能力の個数の増減の宣言、ヘルプの値の確認。
import { describe, expect, test } from "vitest";
import { solveCapture, solveEdit } from "../src/engine/api";
import { CHARAS, LEVELS, type Rules } from "../src/engine/charas";
import { N, cnt, indexOfDice, moveIdx, size } from "../src/engine/multiset";
import { bruteCapture, bruteEdit } from "./brute";

const RULES: Rules[] = ["card", "nim", "nim2019"];

// 再現できる乱数（xorshift）
function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 2 ** 32;
  };
}

test("能力の個数の増減（delta）が選択肢と合う", () => {
  for (const rules of RULES)
    for (const ch of CHARAS) {
      const [lo, hi] = ch.delta(rules);
      let seenLo = Infinity;
      let seenHi = -Infinity;
      const c = [0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < N; i++) {
        if (size[i] > 10) continue;
        for (let k = 0; k < 6; k++) c[k + 1] = cnt[i * 6 + k];
        ch.gen(c, (kind, rm, ad) => {
          const d = ad.length + kind.replace(/C/g, "").length - rm.length;
          seenLo = Math.min(seenLo, d);
          seenHi = Math.max(seenHi, d);
        }, rules);
      }
      if (seenLo === Infinity) continue; // 能力なし（2019 の版の 5 人）
      expect([rules, ch.id, seenLo, seenHi]).toEqual([rules, ch.id, lo, hi]);
    }
});

describe("層 DP = 全探索（撮影）", () => {
  const r = rng(411);
  const cases: { rules: Rules; L: number; held: string[]; H: number; targets: string[] }[] = [];
  // 決まった組: 大きく増やす能力・振った後に選ぶ能力・パチュリー
  cases.push({ rules: "card", L: 3, held: ["kanako", "tenshi", "patchouli"], H: 1, targets: ["cirno"] });
  cases.push({ rules: "nim", L: 3, held: ["kanako", "tenshi", "patchouli"], H: 1, targets: ["cirno"] });
  cases.push({ rules: "card", L: 4, held: ["meiling", "iku", "komachi"], H: 1, targets: ["alice", "tewi", "meiling"] });
  cases.push({ rules: "card", L: 5, held: ["youmu", "mokou", "flandre", "eiki"], H: 2, targets: ["youmu"] });
  cases.push({ rules: "nim2019", L: 5, held: ["lunasa", "eirin", "flandre"], H: 1, targets: ["reimu", "youmu"] });
  cases.push({ rules: "card", L: 6, held: ["patchouli", "sanae"], H: 2, targets: ["ran", "iku"] });
  for (let k = 0; k < 14; k++) {
    const rules = RULES[Math.floor(r() * 3)];
    const L = 3 + Math.floor(r() * 3);
    const pool = [...CHARAS];
    const held: string[] = [];
    const nh = 1 + Math.floor(r() * 4);
    for (let j = 0; j < nh; j++) held.push(pool.splice(Math.floor(r() * pool.length), 1)[0].id);
    const lvTargets = CHARAS.filter((c) => c.level === L).map((c) => c.id);
    const targets = r() < 0.5 ? lvTargets : [lvTargets[Math.floor(r() * lvTargets.length)]];
    cases.push({ rules, L, held, H: Math.floor(r() * 3), targets });
  }
  for (const c of cases)
    test(`${c.rules} L${c.L} ${c.held.join(",")} H${c.H} → ${c.targets.join(",")}`, () => {
      const dp = solveCapture(c.rules, c.L, c.held, c.H, c.targets).expected();
      const bf = bruteCapture(c.rules, c.L, c.held, c.H, c.targets);
      expect(Math.abs(dp - bf)).toBeLessThan(1e-12);
    });
});

test("層 DP = 全探索（編集、一面と二面）", () => {
  for (const [rules, held] of [
    ["card", ["suika", "yukari"]],
    ["card", ["tenshi", "eirin", "keine"]],
    ["nim", ["kanako", "alice"]],
  ] as [Rules, string[]][]) {
    const dp = solveEdit(rules, held).front.expected();
    const bf = bruteEdit(rules, held);
    expect(Math.abs(dp - bf)).toBeLessThan(1e-10);
  }
});

test("ヘルプ 1 枚 = アリスの能力 1 回", () => {
  for (const lv of LEVELS) {
    const targets = CHARAS.filter((c) => c.level === lv).map((c) => c.id);
    const a = solveCapture("card", lv, ["alice"], 0, targets).expected();
    const b = solveCapture("card", lv, [], 1, targets).expected();
    expect(Math.abs(a - b)).toBeLessThan(1e-12);
  }
});

test("能力なしの値（閉じた式）", () => {
  // 紫: 8 個が全部 1 か 6 → 2^8 / 6^8
  expect(solveCapture("card", 8, [], 0, ["yukari"]).expected()).toBeCloseTo(256 / 6 ** 8, 15);
  // 霊夢 ← ヘルプ 1 枚: 5 個のうち 3 以下が 1 個まで、1 個なら振り直して 4 以上 → (1 + 5/2) / 32
  expect(solveCapture("card", 5, [], 1, ["reimu"]).expected()).toBeCloseTo(3.5 / 32, 15);
});

test("隣接表: 足して除くと元に戻る", () => {
  const i = indexOfDice([1, 3, 3, 6]);
  expect(moveIdx(moveIdx(i, [], [5]), [5], [])).toBe(i);
  expect(moveIdx(i, [2], [])).toBe(-1);
});
