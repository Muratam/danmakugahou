// 画面の設定の形と、保存した値（localStorage）の読み込み。Vue や Worker に依存しない（テストから使う）
import { CHARA_BY_ID, LEVELS, type Rules } from "./engine/charas";
import type { Setup } from "./engine/session";

export interface UiSetup {
  rules: Rules;
  mode: "capture" | "edit";
  level: number;
  /** 狙わない被写体（そのレベルの残りから外す。既定は全員を狙う） */
  excluded: string[];
  held: string[];
  help: number;
}

/**
 * 画面で選べる「能力を使えるキャラ」の人数の上限。計算の層は 2^人数 × (ヘルプ + 1) 個あり、
 * 計測（analysis/README.md）では 10 人・ヘルプ 2 枚で約 4 秒、12 人で約 14 秒。ヘルプ 6 枚でも待てる 10 人にする
 * （計算の側の上限は solver.ts の MAX_CHARAS = 12）
 */
export const MAX_HELD = 10;
/** 画面で選べるヘルプの枚数の上限 */
export const MAX_HELP_UI = 6;

export const DEFAULT_SETUP: UiSetup = { rules: "card", mode: "capture", level: 6, excluded: [], held: ["chen", "alice", "sakuya"], help: 1 };

const isInt = (x: unknown, lo: number, hi: number): x is number => typeof x === "number" && Number.isInteger(x) && x >= lo && x <= hi;
const ids = (x: unknown): string[] | null =>
  Array.isArray(x) ? [...new Set(x.filter((id): id is string => typeof id === "string" && CHARA_BY_ID.has(id)))] : null;

/** 保存した文字列から設定を読む。壊れた値・範囲外の値は既定に戻す。held は上限を超えた分を捨てる */
export function parseSetup(raw: string | null): UiSetup {
  const d = DEFAULT_SETUP;
  const fresh = (): UiSetup => ({ ...d, excluded: [...d.excluded], held: [...d.held] });
  if (!raw) return fresh();
  let x: Partial<Record<keyof UiSetup, unknown>>;
  try {
    x = JSON.parse(raw);
  } catch {
    return fresh();
  }
  if (!x || typeof x !== "object" || Array.isArray(x)) return fresh();
  const held = ids(x.held);
  return {
    rules: x.rules === "nim" || x.rules === "nim2019" ? x.rules : "card",
    mode: x.mode === "edit" ? "edit" : "capture",
    level: isInt(x.level, LEVELS[0], LEVELS[LEVELS.length - 1]) ? x.level : d.level,
    excluded: ids(x.excluded) ?? [],
    held: held ? held.slice(0, MAX_HELD) : [...d.held],
    help: isInt(x.help, 0, MAX_HELP_UI) ? x.help : d.help,
  };
}

/** 設定の同一性（解いた結果・試行が同じ設定のものか） */
export const setupKey = (s: Setup) => JSON.stringify([s.rules, s.mode, s.level, [...s.targets].sort(), s.held, s.help]);
