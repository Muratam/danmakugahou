// 画面で共有する設定（解析と試行で同じものを使う）と、DP の結果。
import { computed, reactive, ref, watch } from "vue";
import { solve } from "./client";
import { CHARAS, type Rules } from "./engine/charas";
import type { Setup, Summary } from "./engine/session";
import { parseSetup, setupKey, type UiSetup } from "./setupStore";

export type { UiSetup } from "./setupStore";
export { MAX_HELD, MAX_HELP_UI } from "./setupStore";

const STORE = "danmakugaho:setup:v1";

function load(): UiSetup {
  try {
    return parseSetup(localStorage.getItem(STORE));
  } catch {
    return parseSetup(null);
  }
}

export const ui = reactive<UiSetup>(load());

watch(
  ui,
  (v) => {
    try {
      localStorage.setItem(STORE, JSON.stringify(v));
    } catch {
      /* 保存できなくても動く */
    }
  },
  { deep: true },
);

/** 持っているキャラ（36 人の並び順。並びが DP のビットの番号） */
export const heldOrdered = computed(() => CHARAS.filter((c) => ui.held.includes(c.id)).map((c) => c.id));
/** そのレベルで狙える被写体（持っている人は撮影済みなので除く） */
export const levelTargets = computed(() => CHARAS.filter((c) => c.level === ui.level && !ui.held.includes(c.id)).map((c) => c.id));
export const targets = computed(() => levelTargets.value.filter((id) => !ui.excluded.includes(id)));

export const setup = computed<Setup>(() => ({
  rules: ui.rules,
  mode: ui.mode,
  level: ui.mode === "edit" ? 8 : ui.level,
  targets: ui.mode === "edit" ? [] : targets.value,
  held: heldOrdered.value,
  help: ui.mode === "edit" ? 0 : ui.help,
}));

export const summary = ref<Summary | null>(null);
export const progress = ref<number | null>(null);
export const solveError = ref<string>("");
/** summary が今の setup のものか */
export const summaryKey = ref("");

let reqSeq = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
watch(
  setup,
  (s) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => run(s), 200);
  },
  { immediate: true, deep: true },
);

async function run(s: Setup) {
  const my = ++reqSeq;
  solveError.value = "";
  if (s.mode === "capture" && s.targets.length === 0) {
    summary.value = null;
    summaryKey.value = "";
    progress.value = null;
    return;
  }
  progress.value = 0;
  try {
    const r = await solve(s, (p) => {
      if (my === reqSeq) progress.value = p;
    });
    if (my !== reqSeq) return;
    summary.value = r;
    summaryKey.value = setupKey(s);
  } catch (e) {
    if (my === reqSeq) {
      solveError.value = e instanceof Error ? e.message : String(e);
      summary.value = null;
      summaryKey.value = "";
    }
  } finally {
    if (my === reqSeq) progress.value = null;
  }
}

export const isEdit = computed(() => ui.mode === "edit");

/** 値の表示（撮影は %、編集は点） */
export function fmtValue(v: number, edit = isEdit.value): string {
  if (!Number.isFinite(v)) return "—";
  if (edit) return `${v.toFixed(3)} 点`;
  const p = v * 100;
  if (p >= 99.995 && p < 100) return "99.99%";
  if (p > 0 && p < 0.005) return "<0.01%";
  return `${p.toFixed(2)}%`;
}

export const RULE_LABELS: Record<Rules, string> = {
  card: "カードの文面どおり",
  nim: "元の Nim と同じ",
  nim2019: "2019 年の版（per.txt）",
};

/** 試行・解析で使う乱数（1〜6） */
export const rollDie = () => 1 + Math.floor(Math.random() * 6);

/** public/chara/<id>.png が読めなかった id（CharaIcon が丸の代わりに使う） */
export const imageMissing = new Set<string>();
