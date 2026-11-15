// 試行の進め方（画面に依存しない。テストから使う）。
// 始めたときの設定（Setup）をコピーして持ち、問い合わせはいつもそのコピーで行う。画面の設定が変わったら（キーが違えば）止める。
// 振る手順（R）は roll で振る。問い合わせは query（画面では Worker、テストでは engine を直接）。
import { reactive } from "vue";
import { CHARA_BY_ID, editScore } from "./engine/charas";
import type { Setup, StateAnswer, StateQuery } from "./engine/session";
import type { ActionOption } from "./engine/solver";
import { setupKey } from "./setupStore";

export interface Die {
  v: number;
  fresh: boolean;
}
export interface LogLine {
  who: string;
  text: string;
  value?: number;
}
export interface TrialDeps {
  query: (setup: Setup, q: StateQuery) => Promise<StateAnswer>;
  roll: () => number;
}

const counts7 = (vs: number[]) => {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const v of vs) c[v]++;
  return c;
};

export function createTrial(deps: TrialDeps) {
  const s = reactive({
    playing: false,
    /** 始めたときの設定（コピー） */
    setup: null as Setup | null,
    key: "",
    phase: "front" as "front" | "back",
    dice: [] as Die[],
    U: 0,
    h: 0,
    ops: "",
    opsWho: "",
    answer: null as StateAnswer | null,
    log: [] as LogLine[],
    result: null as { ok: boolean; text: string } | null,
    /** 止めた理由（設定が変わった・計算に失敗した） */
    stopped: "",
    frontScore: 0,
    busy: false,
  });
  /** 試行ごとの番号。止めた・始め直した後に返ってきた古い答えを捨てる */
  let gen = 0;

  const values = () => s.dice.map((d) => d.v);
  const sortDice = (ds: Die[]) => ds.sort((a, b) => a.v - b.v);
  const freshRoll = (n: number): Die[] => sortDice(Array.from({ length: n }, () => ({ v: deps.roll(), fresh: true })));

  function stop(reason: string) {
    if (!s.playing) return;
    gen++;
    s.playing = false;
    s.busy = false;
    s.answer = null;
    s.stopped = reason;
  }

  /** 画面の設定が変わったら呼ぶ。始めたときと違えば止める（null は計算できない設定: 被写体 0 人・失敗） */
  function sync(current: Setup | null) {
    if (s.playing && (!current || setupKey(current) !== s.key)) stop("条件が変わったので試行を止めました。「振って始める」で始め直してください。");
  }

  async function refresh(): Promise<boolean> {
    const my = gen;
    s.busy = true;
    try {
      const a = await deps.query(s.setup!, { phase: s.phase, U: s.U, h: s.h, dice: values(), ops: s.ops });
      if (my !== gen) return false;
      s.answer = a;
      return true;
    } catch (e) {
      if (my === gen) stop(`計算に失敗したので試行を止めました: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    } finally {
      if (my === gen) s.busy = false;
    }
  }

  async function start(setup: Setup) {
    gen++;
    s.setup = JSON.parse(JSON.stringify(setup)) as Setup;
    s.key = setupKey(s.setup);
    s.playing = true;
    s.stopped = "";
    s.result = null;
    s.answer = null;
    s.phase = "front";
    s.U = (1 << s.setup.held.length) - 1;
    s.h = s.setup.help;
    s.ops = "";
    s.opsWho = "";
    s.frontScore = 0;
    s.dice = freshRoll(s.setup.level);
    s.log = [{ who: "roll", text: `${s.setup.level} 個振った: ${values().join(" ")}` }];
    if (await refresh()) s.log[0].value = (s.answer as StateAnswer | null)?.value;
  }

  function applyMove(o: ActionOption) {
    const ds = s.dice.map((d) => ({ v: d.v, fresh: false }));
    for (const r of o.removes) {
      const k = ds.findIndex((d) => d.v === r);
      if (k >= 0) ds.splice(k, 1);
    }
    for (const a of o.adds) ds.push({ v: a, fresh: true });
    s.dice = sortDice(ds);
  }

  /** 能力の途中の手順のうち、振るもの（R）をここで振る */
  async function runOps() {
    const rolled: number[] = [];
    while (s.ops[0] === "R") {
      const v = deps.roll();
      rolled.push(v);
      s.dice = sortDice([...s.dice, { v, fresh: true }]);
      s.ops = s.ops.slice(1);
    }
    const ok = await refresh();
    if (ok && rolled.length) s.log.push({ who: s.opsWho, text: `振った目: ${rolled.join(" ")} → ${values().join(" ")}`, value: s.answer?.value });
  }

  const active = () => s.playing && !s.busy && !s.result && s.setup;

  async function pick(o: ActionOption, who: string) {
    if (!active()) return;
    if (who === "stop") return finish();
    applyMove(o);
    s.U = o.childU;
    s.h = o.childH;
    s.ops = o.kind;
    s.opsWho = who;
    s.log.push({ who, text: `${o.label}${o.kind ? "" : ` → ${values().join(" ")}`}`, value: o.kind ? undefined : o.value });
    await runOps();
  }

  async function pickPending(o: ActionOption) {
    if (!active()) return;
    applyMove(o);
    s.ops = o.kind;
    s.log.push({ who: s.opsWho, text: `${o.label} → ${values().join(" ")}`, value: o.value });
    await runOps();
  }

  async function finish() {
    const setup = s.setup;
    if (!s.playing || !setup) return;
    const vs = values();
    if (setup.mode === "capture") {
      const got = setup.targets.filter((id) => CHARA_BY_ID.get(id)!.cond(counts7(vs), setup.rules));
      s.result = got.length
        ? { ok: true, text: `撮影成功: ${got.map((id) => CHARA_BY_ID.get(id)!.name).join("・")} の条件を満たしています` }
        : { ok: false, text: "撮影失敗: どの被写体の条件も満たしていません" };
      s.log.push({ who: "stop", text: `確定: ${vs.join(" ")}` });
      return;
    }
    const score = editScore(counts7(vs));
    if (s.phase === "front") {
      s.frontScore = score;
      s.log.push({ who: "stop", text: `一面を確定: ${vs.join(" ")} → ${score} 点` });
      s.phase = "back";
      s.ops = "";
      s.dice = freshRoll(8);
      if (await refresh()) s.log.push({ who: "roll", text: `二面: 8 個振った: ${values().join(" ")}`, value: s.answer?.value });
      return;
    }
    s.log.push({ who: "stop", text: `二面を確定: ${vs.join(" ")} → ${score} 点` });
    s.result = { ok: true, text: `評価点: 一面 ${s.frontScore} 点 + 二面 ${score} 点 = ${s.frontScore + score} 点` };
  }

  /** 最善手を 1 つ進める（同じ値なら先に並ぶ方。確定が先頭） */
  async function auto() {
    const a = s.answer;
    if (!a || !active()) return;
    if (a.pending.length) return pickPending(a.pending[0]);
    let best: { o: ActionOption; who: string } | null = null;
    for (const g of a.groups) for (const o of g.options.slice(0, 1)) if (!best || o.value > best.o.value + 1e-12) best = { o, who: g.who };
    if (best) await pick(best.o, best.who);
  }

  return { state: s, start, sync, pick, pickPending, finish, auto, stop };
}

export type Trial = ReturnType<typeof createTrial>;
