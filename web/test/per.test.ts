// per.txt（2019-02-11 の版 8333c2c の出力）を、2019 の版のルール（nim2019）で出し直して一字一句比較する。
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { singleSkillTable } from "../src/engine/api";
import { CHARAS, LEVELS } from "../src/engine/charas";

// per.txt の行の名前は 2019 の版の名前（鈴仙は「イナバ」、映姫は「四季映姫」）
const nimName = (id: string) => ({ reisen: "イナバ", eiki: "四季映姫" })[id] ?? CHARAS.find((c) => c.id === id)!.name;
const pad2 = (x: number) => String(x).padStart(2, " ");

test("per.txt を再現する", () => {
  const expected = readFileSync(new URL("../../per.txt", import.meta.url), "utf8").trimEnd().split("\n");
  const lines: string[] = [];
  for (const lv of LEVELS) {
    lines.push(`LEVEL ${lv}`);
    for (const row of singleSkillTable("nim2019", lv)) {
      // Nim: 各被写体の % を int に切り捨ててから平均し、また切り捨てる。99 で止める
      const mean = row.probs.map((p) => Math.trunc(p * 100)).reduce((a, b) => a + b, 0) / row.probs.length;
      lines.push(`${pad2(Math.min(99, Math.trunc(mean)))}%\t${pad2(Math.min(99, Math.trunc(row.any * 100)))}%\t${nimName(row.user)}`);
    }
  }
  const diff = lines.map((l, i) => (l === expected[i] ? null : `${i + 1}: ${l} ≠ ${expected[i]}`)).filter(Boolean);
  expect(diff).toEqual([]);
  expect(lines.length).toBe(expected.length);
});
