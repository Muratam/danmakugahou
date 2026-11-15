<script setup lang="ts">
// 試行: ダイスを振り、その都度の確率（期待値）を見ながら 1 手ずつ進める。振る手順はここで乱数を使う
import { computed, ref, watch } from "vue";
import { query } from "../client";
import { CHARA_BY_ID, editScore } from "../engine/charas";
import type { StateAnswer } from "../engine/session";
import type { ActionOption } from "../engine/solver";
import { fmtValue, isEdit, rollDie, setup, summary, summaryKey } from "../state";
import ActionList from "./ActionList.vue";
import CharaIcon from "./CharaIcon.vue";
import DieFace from "./DieFace.vue";

interface Die {
  v: number;
  fresh: boolean;
}
interface LogLine {
  who: string;
  text: string;
  value?: number;
}

const playing = ref(false);
const phase = ref<"front" | "back">("front");
const dice = ref<Die[]>([]);
const U = ref(0);
const h = ref(0);
const ops = ref("");
const opsWho = ref("");
const answer = ref<StateAnswer | null>(null);
const log = ref<LogLine[]>([]);
const result = ref<{ ok: boolean; text: string } | null>(null);
const frontScore = ref(0);
const busy = ref(false);
/** この試行を始めたときの設定（途中で設定が変わったら止める） */
const startedKey = ref("");

const values = () => dice.value.map((d) => d.v);
const sortDice = (ds: Die[]) => ds.sort((a, b) => a.v - b.v);
const counts7 = (vs: number[]) => {
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const v of vs) c[v]++;
  return c;
};
const whoName = (who: string) => (who === "help" ? "ヘルプ" : who === "stop" ? "確定" : who === "roll" ? "振る" : CHARA_BY_ID.get(who)?.name ?? who);

function freshRoll(n: number): Die[] {
  return sortDice(Array.from({ length: n }, () => ({ v: rollDie(), fresh: true })));
}

async function refresh() {
  busy.value = true;
  try {
    answer.value = await query(setup.value, { phase: phase.value, U: U.value, h: h.value, dice: values(), ops: ops.value });
  } finally {
    busy.value = false;
  }
}

async function start() {
  if (!summary.value) return;
  startedKey.value = summaryKey.value;
  playing.value = true;
  result.value = null;
  phase.value = "front";
  U.value = (1 << setup.value.held.length) - 1;
  h.value = setup.value.help;
  ops.value = "";
  frontScore.value = 0;
  dice.value = freshRoll(setup.value.level);
  log.value = [{ who: "roll", text: `${setup.value.level} 個振った: ${values().join(" ")}` }];
  await refresh();
  log.value[0].value = answer.value?.value;
}

function applyMove(o: ActionOption) {
  const ds = dice.value.map((d) => ({ v: d.v, fresh: false }));
  for (const r of o.removes) {
    const k = ds.findIndex((d) => d.v === r);
    if (k >= 0) ds.splice(k, 1);
  }
  for (const a of o.adds) ds.push({ v: a, fresh: true });
  dice.value = sortDice(ds);
}

/** 能力の途中の手順のうち、振るもの（R）をここで振る */
async function runOps() {
  const rolled: number[] = [];
  while (ops.value[0] === "R") {
    const v = rollDie();
    rolled.push(v);
    dice.value = sortDice([...dice.value, { v, fresh: true }]);
    ops.value = ops.value.slice(1);
  }
  await refresh();
  if (rolled.length) log.value.push({ who: opsWho.value, text: `振った目: ${rolled.join(" ")} → ${values().join(" ")}`, value: answer.value?.value });
}

async function pick(o: ActionOption, who: string) {
  if (busy.value || result.value) return;
  if (who === "stop") return finish();
  applyMove(o);
  U.value = o.childU;
  h.value = o.childH;
  ops.value = o.kind;
  opsWho.value = who;
  log.value.push({ who, text: `${o.label}${o.kind ? "" : ` → ${values().join(" ")}`}`, value: o.kind ? undefined : o.value });
  await runOps();
}

async function pickPending(o: ActionOption) {
  if (busy.value) return;
  applyMove(o);
  ops.value = o.kind;
  log.value.push({ who: opsWho.value, text: `${o.label} → ${values().join(" ")}`, value: o.value });
  await runOps();
}

async function finish() {
  const vs = values();
  if (!isEdit.value) {
    const got = setup.value.targets.filter((id) => CHARA_BY_ID.get(id)!.cond(counts7(vs), setup.value.rules));
    result.value = got.length
      ? { ok: true, text: `撮影成功: ${got.map((id) => CHARA_BY_ID.get(id)!.name).join("・")} の条件を満たしています` }
      : { ok: false, text: "撮影失敗: どの被写体の条件も満たしていません" };
    log.value.push({ who: "stop", text: `確定: ${vs.join(" ")}` });
    return;
  }
  const score = editScore(counts7(vs));
  if (phase.value === "front") {
    frontScore.value = score;
    log.value.push({ who: "stop", text: `一面を確定: ${vs.join(" ")} → ${score} 点` });
    phase.value = "back";
    ops.value = "";
    dice.value = freshRoll(8);
    await refresh();
    log.value.push({ who: "roll", text: `二面: 8 個振った: ${values().join(" ")}`, value: answer.value?.value });
    return;
  }
  log.value.push({ who: "stop", text: `二面を確定: ${vs.join(" ")} → ${score} 点` });
  result.value = { ok: true, text: `評価点: 一面 ${frontScore.value} 点 + 二面 ${score} 点 = ${frontScore.value + score} 点` };
}

/** 最善手を 1 つ進める（同じ値なら確定を選ぶ） */
async function auto() {
  const a = answer.value;
  if (!a || result.value) return;
  if (a.pending.length) return pickPending(a.pending[0]);
  let best: { o: ActionOption; who: string } | null = null;
  for (const g of a.groups)
    for (const o of g.options.slice(0, 1))
      if (!best || o.value > best.o.value + 1e-12) best = { o, who: g.who };
  if (best) await pick(best.o, best.who);
}

const pendingText = computed(() => {
  if (!ops.value) return "";
  const n = ops.value.length;
  if (ops.value[0] === "C") return `振った目を見て、ダイス ${n} 個まで好きな目に変えられます（1 個ずつ選びます）`;
  return `好きな目のダイスを足します（あと ${n} 個）`;
});
const stale = computed(() => playing.value && startedKey.value !== summaryKey.value);
watch(stale, (s) => {
  if (s) playing.value = false;
});
const shownValue = computed(() => (answer.value && !result.value ? answer.value.value : null));
const scale = computed(() => (isEdit.value ? Math.max(1, ...(answer.value?.groups.flatMap((g) => g.options.map((o) => o.value)) ?? [1]), ...(answer.value?.pending.map((o) => o.value) ?? [])) : 1));
</script>

<template>
  <section
    class="panel"
    aria-label="試行"
  >
    <div class="panel-head">
      <h2>試行{{ isEdit ? (phase === "front" ? "（一面）" : "（二面）") : "" }}</h2>
      <div class="tools">
        <button
          v-if="playing && !result"
          type="button"
          class="btn"
          :disabled="busy"
          @click="auto"
        >
          最善手で 1 手進める
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!summary"
          @click="start"
        >
          {{ playing ? "最初から振り直す" : `${setup.level} 個振って始める` }}
        </button>
      </div>
    </div>

    <p
      v-if="!playing"
      class="quiet"
    >
      左の条件でダイスを振り、能力とヘルプを 1 手ずつ選んで進めます。各行の数字は、その手を選んでから最善に進めたときの{{ isEdit ? "評価点の期待値" : "成功確率" }}です。振る手順（振り直し・振って追加）はこの画面が乱数で振ります。
    </p>
    <div
      v-else
      class="play"
    >
      <div class="table-top">
        <div
          class="dice"
          aria-label="今のダイス"
        >
          <DieFace
            v-for="(d, k) in dice"
            :key="`${k}-${d.v}-${d.fresh}`"
            :value="d.v"
            :size="46"
            :mark="d.fresh ? 'new' : null"
          />
        </div>
        <div
          v-if="shownValue !== null"
          class="now"
        >
          <span class="now-num">{{ fmtValue(shownValue) }}</span>
          <span class="quiet now-label">{{ isEdit ? "この面から最善に進めたときの期待値" : "ここから最善に進めたときの成功確率" }}</span>
        </div>
      </div>

      <div
        v-if="result"
        class="result"
        :class="result.ok ? 'ok' : 'bad'"
        role="status"
      >
        {{ result.text }}
      </div>
      <template v-else-if="answer">
        <template v-if="answer.pending.length">
          <p class="pending">
            <CharaIcon
              v-if="CHARA_BY_ID.has(opsWho)"
              :id="opsWho"
              :size="24"
            />
            {{ pendingText }}
          </p>
          <ActionList
            :groups="[{ who: opsWho, options: answer.pending }]"
            :pickable="!busy"
            :scale="scale"
            expand-all
            @pick="(o) => pickPending(o)"
          />
        </template>
        <ActionList
          v-else
          :groups="answer.groups"
          :pickable="!busy"
          :scale="scale"
          @pick="pick"
        />
      </template>

      <ol
        class="log"
        aria-label="経過"
      >
        <li
          v-for="(l, k) in log"
          :key="k"
        >
          <span class="log-who">{{ whoName(l.who) }}</span>
          <span class="log-text">{{ l.text }}</span>
          <span
            v-if="l.value !== undefined"
            class="log-val quiet"
          >{{ fmtValue(l.value) }}</span>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.tools {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tools .btn {
  min-height: 34px;
}
.play {
  display: grid;
  gap: 12px;
}
.table-top {
  display: grid;
  gap: 10px;
  padding: 14px;
  background: var(--bg-side);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
.dice {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.now {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
}
.now-num {
  font-size: 1.9rem;
  font-weight: 700;
  line-height: 1.1;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.now-label {
  font-size: 0.8rem;
}
.pending {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.86rem;
  font-weight: 600;
}
.result {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  font-weight: 650;
}
.result.ok {
  background: var(--ok-soft);
  border: 1px solid var(--ok);
}
.result.bad {
  background: var(--bad-soft);
  border: 1px solid var(--bad);
}
.log {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 8px 0 0;
  border-top: 1px solid var(--line);
  list-style: none;
  font-size: 0.8rem;
}
.log li {
  display: grid;
  grid-template-columns: 6.5em 1fr auto;
  gap: 8px;
}
.log-who {
  color: var(--ink-soft);
}
.log-text {
  min-width: 0;
  overflow-wrap: anywhere;
}
.log-val {
  font-variant-numeric: tabular-nums;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
