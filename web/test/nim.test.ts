// 元の Nim（main.nim の reduceGraphs）との照合。ルールは nim（Nim と同じ能力の選択肢）、ヘルプなし。
// 値は Nim 1.2.18 で diceMaxCount = 10 にしてビルドしたものの出力（このファイルの組では 10 個を超えない）。
//   exact:  reduceGraphs の枝刈り（n <= 7 で「per < hereMax なら先に伸ばさない」）を外したもの
//   pruned: 元のまま。枝刈りで最善の道を落とすことがあり、1 件目だけ小さい（62.613… < 62.695…）
// 作り方は analysis/README.md。
import { expect, test } from "vitest";
import { solveCapture } from "../src/engine/api";
import { CHARAS } from "../src/engine/charas";

const byNimName = (name: string) => {
  const alias: Record<string, string> = { イナバ: "reisen", 四季映姫: "eiki" };
  return alias[name] ?? CHARAS.find((c) => c.name === name)!.id;
};

const CASES: [string, number, number][] = [
  ["紫 リグル アリス 咲夜 永琳 輝夜", 62.69560026418723, 62.61335924401759],
  ["霊夢 アリス", 10.9375, 10.9375],
  ["紫 リグル", 0.05588578976781994, 0.05588578976781994],
  ["紫", 0.01524157902758726, 0.01524157902758726],
  ["霊夢 妖夢 妹紅 天子 フランドール", 94.1165123456788, 94.1165123456788],
  ["藍 天子 てゐ リリカ", 87.71862139917647, 87.71862139917647],
  ["萃香 早苗 レミリア 幽々子 永琳", 73.87069425392482, 73.87069425392482],
  ["神奈子 幽香 妹紅 メルラン", 2.167102480566989, 2.167102480566989],
  ["チルノ 慧音 小町 美鈴 神奈子", 96.7811210684135, 96.7811210684135],
  ["ミスティア 衣玖 天子 神奈子", 99.96296772595637, 99.96296772595637],
  ["輝夜 四季映姫 アリス", 11.66730967078188, 11.66730967078188],
  ["霊夢 パチュリー アリス", 25.77234171382031, 25.77234171382031],
  ["妖夢 妖夢 ルナサ 魔理沙", 25.69444444444444, 25.69444444444444],
  ["フランドール 萃香 紫 ルーミア", 32.82315719783575, 32.82315719783575],
];

for (const [names, exact, pruned] of CASES)
  test(`Nim: ${names}`, () => {
    const [target, ...held] = names.split(" ").map(byNimName);
    const lv = CHARAS.find((c) => c.id === target)!.level;
    const v = solveCapture("nim", lv, held, 0, [target]).expected() * 100;
    expect(Math.abs(v - exact) / exact).toBeLessThan(1e-12);
    expect(v).toBeGreaterThanOrEqual(pruned - 1e-9);
  });

test("カードの文面どおりのルールでも、Nim と違いが無い組は同じ値", () => {
  // 紫 ← リグル・アリス・咲夜・永琳・輝夜 は、カードと Nim で能力・条件が同じ
  const v = solveCapture("card", 8, ["wriggle", "alice", "sakuya", "eirin", "kaguya"], 0, ["yukari"]).expected() * 100;
  expect(v).toBeCloseTo(62.69560026418723, 10);
});
