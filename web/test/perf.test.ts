// 計測（普段は飛ばす）: PERF=1 PERF_OUT=<出力の .md> npx vitest run test/perf.test.ts
// 時間・層の数・状態の数・選択肢の数・メモリ（heapUsed の差）を表にして標準出力に出す。
import { writeFileSync } from "node:fs";
import { test } from "vitest";
import { solveCapture, solveEdit } from "../src/engine/api";
import { CHARAS } from "../src/engine/charas";

const lvIds = (lv: number) => CHARAS.filter((c) => c.level === lv).map((c) => c.id);

test.skipIf(!process.env.PERF)("計測", () => {
  const rows: string[] = ["| 条件 | 結果 | 時間 | 層 | 状態 | 選択肢 | メモリ |", "|---|---|---|---|---|---|---|"];
  const run = (label: string, f: () => { v: number; stats: { layers: number; states: number; options: number } }) => {
    global.gc?.();
    const m0 = process.memoryUsage().heapUsed + process.memoryUsage().arrayBuffers;
    const t0 = performance.now();
    const { v, stats } = f();
    const ms = performance.now() - t0;
    const m1 = process.memoryUsage().heapUsed + process.memoryUsage().arrayBuffers;
    rows.push(`| ${label} | ${v.toFixed(6)} | ${ms.toFixed(0)} ms | ${stats.layers} | ${stats.states} | ${stats.options} | ${((m1 - m0) / 1e6).toFixed(0)} MB |`);
  };
  const cap = (rules: "card" | "nim", lv: number, held: string[], H: number, targets: string[]) => () => {
    const dp = solveCapture(rules, lv, held, H, targets);
    return { v: dp.expected() * 100, stats: dp.stats };
  };
  run("紫 ← リグル・アリス・咲夜・永琳・輝夜（nim）", cap("nim", 8, ["wriggle", "alice", "sakuya", "eirin", "kaguya"], 0, ["yukari"]));
  run("紫 ← リグル・アリス・パチュリー・永琳・輝夜（nim）", cap("nim", 8, ["wriggle", "alice", "patchouli", "eirin", "kaguya"], 0, ["yukari"]));
  run("紫 ← リグル・アリス・パチュリー・永琳・輝夜（card）", cap("card", 8, ["wriggle", "alice", "patchouli", "eirin", "kaguya"], 0, ["yukari"]));
  run("Lv8 いずれか ← パチュリー＋5 人・ヘルプ 3", cap("card", 8, ["patchouli", "alice", "eirin", "kaguya", "remilia", "sakuya"], 3, lvIds(8)));
  run("Lv8 いずれか ← 8 人（パチュリー・天子・美鈴・衣玖・小町を含む）・ヘルプ 3", cap("card", 8, ["patchouli", "tenshi", "meiling", "iku", "komachi", "eirin", "yuka", "flandre"], 3, lvIds(8)));
  run("Lv8 いずれか ← 10 人（同上＋魔理沙・幽々子）・ヘルプ 2", cap("card", 8, ["patchouli", "tenshi", "meiling", "iku", "komachi", "eirin", "yuka", "flandre", "marisa", "yuyuko"], 2, lvIds(8)));
  run("Lv8 いずれか ← 12 人（各レベル 2 人、パチュリー・天子を含む）・ヘルプ 2", cap("card", 8, ["cirno", "keine", "alice", "meiling", "patchouli", "reimu", "eirin", "iku", "tenshi", "komachi", "lunasa", "sakuya"], 2, lvIds(8)));
  run("編集 ← 萃香・紫・神奈子・パチュリー・天子・衣玖", () => {
    const e = solveEdit("card", ["suika", "yukari", "kanako", "patchouli", "tenshi", "iku"]);
    const s = { layers: e.front.stats.layers + e.back.stats.layers, states: e.front.stats.states + e.back.stats.states, options: e.front.stats.options + e.back.stats.options };
    return { v: e.front.expected(), stats: s };
  });
  if (process.env.PERF_OUT) writeFileSync(process.env.PERF_OUT, rows.join("\n") + "\n");
  else console.log(rows.join("\n"));
});
