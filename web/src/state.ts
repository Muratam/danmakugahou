// 画面で共有する設定（解析と試行で同じものを使う）と、DP の結果。
import { computed, reactive, ref, watch } from "vue";
import { solve } from "./client";
import { CHARAS, CHARA_BY_ID, type Rules } from "./engine/charas";
import type { Setup, Summary } from "./engine/session";

export interface UiSetup {
  rules: Rules;
  mode: "capture" | "edit";
  level: number;
  /** 狙わない被写体（そのレベルの残りから外す。既定は全員を狙う） */
  excluded: string[];
  held: string[];
  help: number;
}

const STORE = "danmakugaho:setup:v1";

function load(): UiSetup {
  const d: UiSetup = { rules: "card", mode: "capture", level: 6, excluded: [], held: ["chen", "alice", "sakuya"], help: 1 };
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return d;
    const x = JSON.parse(raw) as Partial<UiSetup>;
    return {
      rules: x.rules === "nim" || x.rules === "nim2019" ? x.rules : "card",
      mode: x.mode === "edit" ? "edit" : "capture",
      level: typeof x.level === "number" && x.level >= 3 && x.level <= 8 ? x.level : d.level,
      excluded: Array.isArray(x.excluded) ? x.excluded.filter((id) => CHARA_BY_ID.has(id)) : [],
      held: Array.isArray(x.held) ? x.held.filter((id) => CHARA_BY_ID.has(id)) : d.held,
      help: typeof x.help === "number" && x.help >= 0 && x.help <= 6 ? x.help : d.help,
    };
  } catch {
    return d;
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
    summaryKey.value = JSON.stringify(s);
  } catch (e) {
    if (my === reqSeq) solveError.value = e instanceof Error ? e.message : String(e);
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
