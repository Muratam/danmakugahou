// 画面から使う形（Web Worker の中で動く）。設定（Setup）ごとに解いた DP を持ち、状態の問い合わせに答える。
import { scoreTable, solveCapture, solveEdit, singleSkillTable, type EditSolution, type SkillTableRow } from "./api";
import { CHARAS, type Rules } from "./charas";
import { indexOfDice, off, rollProb } from "./multiset";
import { setupKey } from "../setupStore";
import { LayerDP, type ActionGroup, type ActionOption } from "./solver";

export interface Setup {
  rules: Rules;
  mode: "capture" | "edit";
  /** 撮影のレベル（3〜8） */
  level: number;
  /** 撮影の目的: この中のどれか 1 人の条件を満たす（ラストラウンドや特定の 1 人なら 1 人だけ） */
  targets: string[];
  /** 撮影に成功していて能力を使えるキャラ（並びがビットの番号） */
  held: string[];
  /** アンタップのヘルプの枚数（撮影だけ） */
  help: number;
}

export interface Summary {
  /** 目的の値（撮影: 成功確率 0〜1、編集: 一面と二面の合計の期待値） */
  value: number;
  /** 撮影: 目的の各被写体を 1 人だけ狙ったときの成功確率 */
  perTarget: { id: string; p: number }[];
  /** 編集: 二面だけの期待値（能力を全部二面に残したとき）と、能力を使わないときの 1 面の期待値 */
  edit?: { backAll: number; noSkill: number };
  ms: number;
  layers: number;
  states: number;
}

/** 状態。phase は編集の一面（front）・二面（back）。撮影は front */
export interface StateQuery {
  phase: "front" | "back";
  U: number;
  h: number;
  dice: number[];
  /** 能力の途中の残りの手順（"C"・"CC"・"A" など。先頭が R のときは画面が先に振る） */
  ops?: string;
}

export interface StateAnswer {
  value: number;
  /** 確定したときの値（撮影: 0 か 1、編集: 評価点） */
  stopValue: number;
  groups: ActionGroup[];
  pending: ActionOption[];
}


class Solved {
  capture?: LayerDP;
  edit?: EditSolution;
  summary: Summary;
  constructor(readonly setup: Setup, onProgress?: (d: number, t: number) => void) {
    const t0 = performance.now();
    if (setup.mode === "capture") {
      const dp = solveCapture(setup.rules, setup.level, setup.held, setup.help, setup.targets, onProgress);
      this.capture = dp;
      const perTarget =
        setup.targets.length > 1
          ? setup.targets.map((id) => ({ id, p: solveCapture(setup.rules, setup.level, setup.held, setup.help, [id]).expected() }))
          : setup.targets.map((id) => ({ id, p: dp.expected() }));
      this.summary = { value: dp.expected(), perTarget, ms: 0, layers: dp.stats.layers, states: dp.stats.states };
    } else {
      const e = solveEdit(setup.rules, setup.held, onProgress);
      this.edit = e;
      let noSkill = 0;
      for (let i = off[8]; i < off[9]; i++) noSkill += rollProb[i] * scoreTable[i];
      this.summary = {
        value: e.front.expected(),
        perTarget: [],
        edit: { backAll: e.backValue[e.back.full], noSkill },
        ms: 0,
        layers: e.front.stats.layers + e.back.stats.layers,
        states: e.front.stats.states + e.back.stats.states,
      };
    }
    this.summary.ms = performance.now() - t0;
  }

  dp(phase: "front" | "back"): LayerDP {
    if (this.capture) return this.capture;
    return phase === "front" ? this.edit!.front : this.edit!.back;
  }

  query(q: StateQuery): StateAnswer {
    const dp = this.dp(q.phase);
    const i = indexOfDice([...q.dice].sort((a, b) => a - b));
    const ops = q.ops ?? "";
    if (ops) {
      return { value: dp.value(q.U, q.h, i, ops), stopValue: NaN, groups: [], pending: dp.pendingOptions(q.U, q.h, i, ops) };
    }
    const groups = dp.actions(q.U, q.h, i);
    return { value: dp.value(q.U, q.h, i), stopValue: dp.goal(q.U, i), groups, pending: [] };
  }
}

const solved = new Map<string, Solved>();

export function solve(setup: Setup, onProgress?: (d: number, t: number) => void): Summary {
  const key = setupKey(setup);
  let s = solved.get(key);
  if (!s) {
    // メモリを抑えるため、持つのは直近の 2 つまで
    while (solved.size >= 2) solved.delete(solved.keys().next().value!);
    s = new Solved(setup, onProgress);
    solved.set(key, s);
  }
  return s.summary;
}

export function query(setup: Setup, q: StateQuery): StateAnswer {
  solve(setup);
  return solved.get(setupKey(setup))!.query(q);
}

/** 能力の表。先頭に能力なしの行（user が空）を足す */
export function skillTable(rules: Rules, level: number, help: number): SkillTableRow[] {
  const targets = CHARAS.filter((c) => c.level === level).map((c) => c.id);
  const none: SkillTableRow = {
    user: "",
    probs: targets.map((t) => solveCapture(rules, level, [], help, [t]).expected()),
    any: solveCapture(rules, level, [], help, targets).expected(),
  };
  return [none, ...singleSkillTable(rules, level, help)];
}
