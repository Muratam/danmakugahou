// 試行（src/trial.ts）: 始めたときの設定のコピーで進めること、途中で条件が変わったら止まること、失敗で止まること
import { expect, test } from "vitest";
import type { Setup, StateAnswer, StateQuery } from "../src/engine/session";
import { query } from "../src/engine/session";
import { createTrial } from "../src/trial";

const base: Setup = { rules: "card", mode: "capture", level: 6, targets: ["remilia", "iku", "eirin", "yuka", "yuyuko", "ran"], held: ["chen", "alice", "sakuya"], help: 2 };

/** 決まった順の目を返す（尽きたら最初から） */
function dice(seq: number[]) {
  let k = 0;
  return () => seq[k++ % seq.length];
}
const engine = { calls: [] as { setup: Setup; q: StateQuery }[] };
const q = async (setup: Setup, sq: StateQuery) => {
  engine.calls.push({ setup, q: sq });
  return query(setup, sq);
};

test("最後まで進むと撮影の成否が出る", async () => {
  const t = createTrial({ query: q, roll: dice([1, 2, 3, 4, 5, 6, 6, 2]) });
  await t.start(base);
  for (let k = 0; k < 20 && !t.state.result; k++) await t.auto();
  expect(t.state.result).not.toBeNull();
  expect(t.state.log.length).toBeGreaterThan(1);
});

test("始めた後に元の設定を書き換えても、問い合わせは始めたときのコピーで行う", async () => {
  const s: Setup = JSON.parse(JSON.stringify(base));
  const t = createTrial({ query: q, roll: dice([2, 2, 3, 5, 6, 1]) });
  await t.start(s);
  s.help = 0;
  s.held.pop();
  engine.calls.length = 0;
  // ヘルプを使う
  const help = t.state.answer!.groups.find((g) => g.who === "help")!;
  await t.pick(help.options[0], "help");
  expect(t.state.h).toBe(1);
  expect(engine.calls.at(-1)!.setup.help).toBe(2);
  expect(engine.calls.at(-1)!.setup.held).toHaveLength(3);
});

test("途中で条件（ヘルプの枚数）が変わったら止まり、その後の操作では問い合わせない", async () => {
  const t = createTrial({ query: q, roll: dice([2, 2, 3, 5, 6, 1]) });
  await t.start(base);
  const help = t.state.answer!.groups.find((g) => g.who === "help")!;
  const opt = help.options[0];
  t.sync({ ...base });
  expect(t.state.playing).toBe(true);
  t.sync({ ...base, help: 0 });
  expect(t.state.playing).toBe(false);
  expect(t.state.stopped).toMatch(/条件が変わった/);
  engine.calls.length = 0;
  await t.pick(opt, "help");
  await t.auto();
  await t.finish();
  expect(engine.calls).toHaveLength(0);
  expect(t.state.result).toBeNull();
});

test("被写体が 0 人・計算の失敗（null）でも止まる", async () => {
  const t = createTrial({ query: q, roll: dice([1, 3, 5]) });
  await t.start(base);
  t.sync({ ...base, targets: [] });
  expect(t.state.playing).toBe(false);
  await t.start(base);
  t.sync(null);
  expect(t.state.playing).toBe(false);
});

test("問い合わせが失敗したら止まる（例外を外に出さない）", async () => {
  const t = createTrial({ query: async () => Promise.reject(new Error("壊れた")), roll: dice([1]) });
  await t.start(base);
  expect(t.state.playing).toBe(false);
  expect(t.state.stopped).toMatch(/壊れた/);
});

test("止めた後に返ってきた古い答えは捨てる", async () => {
  let release!: (a: StateAnswer) => void;
  const slow = (setup: Setup, sq: StateQuery) =>
    new Promise<StateAnswer>((res) => {
      release = res;
      void setup;
      void sq;
    });
  const t = createTrial({ query: slow, roll: dice([1]) });
  const p = t.start(base);
  t.sync({ ...base, level: 7 });
  release(await query(base, { phase: "front", U: 7, h: 2, dice: [1, 1, 1, 1, 1, 1] }));
  await p;
  expect(t.state.playing).toBe(false);
  expect(t.state.answer).toBeNull();
});

test("編集: 一面を確定すると二面に移り、合計が出る", async () => {
  const t = createTrial({ query: q, roll: dice([1, 6, 6, 3, 6, 2, 6, 5, 4]) });
  await t.start({ rules: "card", mode: "edit", level: 8, targets: [], held: ["suika", "yukari"], help: 0 });
  for (let k = 0; k < 20 && !t.state.result; k++) await t.auto();
  expect(t.state.phase).toBe("back");
  expect(t.state.result?.text).toMatch(/一面 \d+ 点 \+ 二面 \d+ 点/);
});
