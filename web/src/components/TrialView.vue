<script setup lang="ts">
// 試行: ダイスを振り、その都度の確率（期待値）を見ながら 1 手ずつ進める。進め方は src/trial.ts（始めたときの設定のコピーで問い合わせる）
import { computed, toRefs, watch } from "vue";
import { query } from "../client";
import { CHARA_BY_ID } from "../engine/charas";
import { fmtValue, isEdit, rollDie, setup, solveError, summary, summaryKey } from "../state";
import { setupKey } from "../setupStore";
import { createTrial } from "../trial";
import ActionList from "./ActionList.vue";
import { vCharaTip } from "../charaTip";
import CharaIcon from "./CharaIcon.vue";
import DieFace from "./DieFace.vue";

const t = createTrial({ query, roll: rollDie });
const { playing, phase, dice, ops, opsWho, answer, log, result, busy, stopped } = toRefs(t.state);
const { pick, pickPending, auto } = t;

/** 今の設定で計算が済んでいるか（被写体 0 人・計算の失敗・計算中は始めない） */
const ready = computed(() => !!summary.value && !solveError.value && summaryKey.value === setupKey(setup.value));
// 設定が変わった・計算できなくなったら止める
watch([() => setupKey(setup.value), solveError], () => t.sync(solveError.value ? null : setup.value));

function start() {
  if (ready.value) t.start(setup.value);
}

const whoName = (who: string) => (who === "help" ? "ヘルプ" : who === "stop" ? "確定" : who === "roll" ? "振る" : CHARA_BY_ID.get(who)?.name ?? who);
const pendingText = computed(() => {
  if (!ops.value) return "";
  const n = ops.value.length;
  if (ops.value[0] === "C") return `振った目を見て、ダイス ${n} 個まで好きな目に変えられます（1 個ずつ選びます）`;
  return `好きな目のダイスを足します（あと ${n} 個）`;
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
          :disabled="!ready"
          @click="start"
        >
          {{ playing ? "最初から振り直す" : `${setup.level} 個振って始める` }}
        </button>
      </div>
    </div>

    <p
      v-if="!playing && stopped"
      class="stopped"
      role="status"
    >
      {{ stopped }}
    </p>
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
              v-chara-tip="opsWho"
              :size="24"
              no-title
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
.stopped {
  margin-bottom: 8px;
  color: var(--lv7);
  font-size: 0.86rem;
}
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
