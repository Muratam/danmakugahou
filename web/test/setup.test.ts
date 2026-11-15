// 保存した設定の読み込み（壊れた値・範囲外・人数の上限）と、計算の側の入力の検査
import { expect, test } from "vitest";
import { solveCapture } from "../src/engine/api";
import { CHARAS } from "../src/engine/charas";
import { MAX_CHARAS } from "../src/engine/solver";
import { DEFAULT_SETUP, MAX_HELD, parseSetup } from "../src/setupStore";

const all = CHARAS.map((c) => c.id);

test("保存が無い・JSON でない・オブジェクトでないときは既定", () => {
  for (const raw of [null, "", "{", "null", "[]", "3", '"x"']) expect(parseSetup(raw)).toEqual(DEFAULT_SETUP);
});

test("level と help は整数で範囲内のときだけ使う", () => {
  const p = (x: object) => parseSetup(JSON.stringify(x));
  expect(p({ level: 7, help: 3 })).toMatchObject({ level: 7, help: 3 });
  for (const bad of [1.5, 2.0000001, -1, 7, 99, "2", null, true, Number.NaN])
    expect(p({ help: bad }).help, String(bad)).toBe(DEFAULT_SETUP.help);
  for (const bad of [5.5, 2, 9, "6", null]) expect(p({ level: bad }).level, String(bad)).toBe(DEFAULT_SETUP.level);
  // NaN・Infinity は JSON では null になる
  expect(parseSetup('{"help":1e400}').help).toBe(DEFAULT_SETUP.help);
});

test("held は知っている id だけ・重複なし・上限まで", () => {
  const r = parseSetup(JSON.stringify({ held: all }));
  expect(r.held).toHaveLength(MAX_HELD);
  expect(r.held).toEqual(all.slice(0, MAX_HELD));
  expect(parseSetup(JSON.stringify({ held: ["alice", "alice", "nobody", 3, null, "reimu"] })).held).toEqual(["alice", "reimu"]);
  expect(parseSetup(JSON.stringify({ held: "alice" })).held).toEqual(DEFAULT_SETUP.held);
  expect(parseSetup(JSON.stringify({ excluded: ["x", "cirno"] })).excluded).toEqual(["cirno"]);
});

test("以前の版で保存したルール（nim・nim2019）は読まない（画面はカードの文面どおりだけ）", () => {
  for (const rules of ["nim", "nim2019", "card"]) {
    const r = parseSetup(JSON.stringify({ ...DEFAULT_SETUP, rules, level: 7 }));
    expect(r).toEqual({ ...DEFAULT_SETUP, level: 7 });
    expect(r).not.toHaveProperty("rules");
  }
});

test("既定の値を書き換えても次の読み込みに残らない", () => {
  const a = parseSetup(null);
  a.held.push("reimu");
  expect(parseSetup(null).held).toEqual(DEFAULT_SETUP.held);
});

test("上限は計算の側の上限以下", () => {
  expect(MAX_HELD).toBeLessThanOrEqual(MAX_CHARAS);
});

test("計算の側も、人数の上限・ヘルプとダイスの数の整数を確かめる", () => {
  expect(() => solveCapture("card", 5, all.slice(0, MAX_CHARAS + 1), 0, ["reimu"])).toThrow(/まで/);
  expect(() => solveCapture("card", 5, all.slice(0, 31), 0, ["reimu"])).toThrow(/まで/);
  expect(() => solveCapture("card", 5, ["alice"], 1.5, ["reimu"])).toThrow(/ヘルプ/);
  expect(() => solveCapture("card", 5, ["alice"], -1, ["reimu"])).toThrow(/ヘルプ/);
  expect(() => solveCapture("card", 4.5, ["alice"], 0, ["reimu"])).toThrow(/ダイス/);
  expect(() => solveCapture("card", 5, ["alice", "alice"], 0, ["reimu"])).toThrow(/2 回/);
});
