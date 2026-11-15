<script setup lang="ts">
// 条件: 撮影か編集か・レベル・狙う被写体・能力を使えるキャラ・ヘルプ
import { computed } from "vue";
import { CHARAS, CHARA_BY_ID, LEVELS } from "../engine/charas";
import { MAX_HELD, MAX_HELP_UI, levelTargets, progress, ui } from "../state";
import CharaIcon from "./CharaIcon.vue";

const byLevel = computed(() => LEVELS.map((lv) => ({ lv, charas: CHARAS.filter((c) => c.level === lv) })));

function toggleHeld(id: string) {
  const i = ui.held.indexOf(id);
  if (i >= 0) ui.held.splice(i, 1);
  else if (ui.held.length < MAX_HELD) ui.held.push(id);
}
const full = computed(() => ui.held.length >= MAX_HELD);
function toggleTarget(id: string) {
  const i = ui.excluded.indexOf(id);
  if (i >= 0) ui.excluded.splice(i, 1);
  else ui.excluded.push(id);
}
function setLevel(lv: number) {
  ui.level = lv;
  ui.excluded = [];
}
const heldCount = computed(() => ui.held.length);
</script>

<template>
  <section
    class="panel setup"
    aria-label="条件"
  >
    <div class="panel-head">
      <h2>条件</h2>
      <span
        v-if="progress !== null"
        class="busy quiet"
      >計算中 {{ Math.round(progress * 100) }}%</span>
    </div>

    <div
      class="seg"
      role="group"
      aria-label="フェイズ"
    >
      <button
        type="button"
        :aria-pressed="ui.mode === 'capture'"
        @click="ui.mode = 'capture'"
      >
        撮影
      </button>
      <button
        type="button"
        :aria-pressed="ui.mode === 'edit'"
        @click="ui.mode = 'edit'"
      >
        編集
      </button>
    </div>

    <template v-if="ui.mode === 'capture'">
      <div class="field">
        <span class="field-label">レベル（振るダイスの数）</span>
        <div
          class="levels"
          role="group"
          aria-label="レベル"
        >
          <button
            v-for="lv in LEVELS"
            :key="lv"
            type="button"
            class="lv"
            :style="{ '--c': `var(--lv${lv})` }"
            :aria-pressed="ui.level === lv"
            @click="setLevel(lv)"
          >
            {{ lv }}
          </button>
        </div>
      </div>

      <div class="field">
        <span class="field-label">狙う被写体（どれか 1 人の条件を満たせば成功）</span>
        <div class="picks">
          <button
            v-for="id in levelTargets"
            :key="id"
            type="button"
            class="pick"
            :aria-pressed="!ui.excluded.includes(id)"
            :title="`${CHARA_BY_ID.get(id)!.fullName}: ${CHARA_BY_ID.get(id)!.condText}`"
            @click="toggleTarget(id)"
          >
            <CharaIcon
              :id="id"
              :size="30"
            />
            <span class="pick-text">
              <span class="pick-name">{{ CHARA_BY_ID.get(id)!.name }}</span>
              <span class="pick-sub">{{ CHARA_BY_ID.get(id)!.condText }}</span>
            </span>
          </button>
          <p
            v-if="levelTargets.length === 0"
            class="quiet small"
          >
            このレベルの被写体は全員撮影済みです。
          </p>
        </div>
        <p class="quiet small">
          ラストラウンドは先に 1 人を選ぶので、その人だけを残します。
        </p>
      </div>

      <div class="field">
        <span class="field-label">アンタップのヘルプ（ダイス 1 個を振り直す）</span>
        <div class="stepper">
          <button
            type="button"
            class="btn"
            aria-label="減らす"
            :disabled="ui.help <= 0"
            @click="ui.help--"
          >
            −
          </button>
          <output>{{ ui.help }} 枚</output>
          <button
            type="button"
            class="btn"
            aria-label="増やす"
            :disabled="ui.help >= MAX_HELP_UI"
            @click="ui.help++"
          >
            ＋
          </button>
        </div>
      </div>
    </template>
    <p
      v-else
      class="quiet small"
    >
      ダイス 8 個で一面と二面を作ります。ヘルプは使えず、一面で使った能力は二面で使えません。合計の評価点の期待値が最大になるように、一面でどの能力を使うかまで計算します。
    </p>

    <div class="field">
      <span class="field-label">能力を使えるキャラ（撮影に成功した被写体） {{ heldCount }} / {{ MAX_HELD }} 人</span>
      <div
        v-for="row in byLevel"
        :key="row.lv"
        class="held-row"
      >
        <span
          class="held-lv"
          :style="{ color: `var(--lv${row.lv})` }"
        >Lv{{ row.lv }}</span>
        <div class="held-icons">
          <button
            v-for="c in row.charas"
            :key="c.id"
            type="button"
            class="held"
            :aria-pressed="ui.held.includes(c.id)"
            :disabled="full && !ui.held.includes(c.id)"
            :title="`${c.fullName}: ${c.skillText}`"
            @click="toggleHeld(c.id)"
          >
            <CharaIcon
              :id="c.id"
              :size="34"
            />
            <span class="held-name">{{ c.name }}</span>
          </button>
        </div>
      </div>
      <p
        v-if="full"
        class="warn small"
      >
        選べるのは {{ MAX_HELD }} 人までです（計算の表が 2^人数 個に増え、時間とメモリが足りなくなるため）。
      </p>
    </div>
  </section>
</template>

<style scoped>
.setup {
  display: grid;
  gap: 14px;
  align-content: start;
}
.busy {
  font-size: 0.78rem;
}
.small {
  font-size: 0.78rem;
}
.warn {
  color: var(--lv7);
}
.seg {
  display: inline-flex;
  justify-self: start;
  padding: 2px;
  background: var(--bg-side);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
}
.seg button {
  min-height: 32px;
  padding: 0 16px;
  background: none;
  border: 0;
  border-radius: 3px;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
}
.seg button[aria-pressed="true"] {
  background: var(--surface-3);
  color: var(--ink);
}
.levels {
  display: flex;
  gap: 6px;
}
.lv {
  flex: 1;
  min-width: 0;
  min-height: 38px;
  background: var(--bg-side);
  border: 1px solid var(--line-strong);
  border-bottom: 3px solid var(--c);
  border-radius: var(--radius-sm);
  color: var(--ink-soft);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.lv[aria-pressed="true"] {
  background: var(--c);
  border-color: var(--c);
  color: var(--die-pip);
}
.picks {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 6px;
}
.pick {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 5px 8px 5px 5px;
  background: var(--bg-side);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--ink-faint);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.pick[aria-pressed="true"] {
  border-color: var(--line-strong);
  background: var(--surface-2);
  color: var(--ink);
}
.pick[aria-pressed="false"] :deep(.chara) {
  opacity: 0.35;
}
.pick-text {
  display: grid;
  min-width: 0;
  line-height: 1.3;
}
.pick-name {
  font-size: 0.84rem;
  font-weight: 600;
}
/* 条件の文は折り返して全文を出す（スマホの幅で切れないように）。対応するブラウザでは文節で折り返す（「12 以/下」を避ける。Safari は無視して文字ごと） */
.pick-sub {
  font-size: 0.72rem;
  color: var(--ink-soft);
  overflow-wrap: anywhere;
  word-break: auto-phrase;
}
.stepper {
  display: flex;
  align-items: center;
  gap: 10px;
}
.stepper .btn {
  min-width: 40px;
  padding: 0;
}
.stepper output {
  min-width: 3.5em;
  text-align: center;
  font-weight: 600;
}
.held-row {
  display: grid;
  grid-template-columns: 34px 1fr;
  align-items: start;
  gap: 6px;
}
.held-lv {
  padding-top: 12px;
  font-size: 0.74rem;
  font-weight: 700;
}
.held-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.held {
  display: grid;
  align-content: start;
  justify-items: center;
  gap: 1px;
  width: 52px;
  padding: 3px 0 2px;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--ink-faint);
  font: inherit;
  cursor: pointer;
}
.held :deep(.chara) {
  opacity: 0.32;
  filter: grayscale(0.7);
}
.held[aria-pressed="true"] {
  background: var(--accent-soft);
  border-color: rgba(71, 200, 230, 0.35);
  color: var(--ink);
}
.held[aria-pressed="true"] :deep(.chara) {
  opacity: 1;
  filter: none;
}
/* 長い名前（フランドール）は折り返して全文を出す */
.held-name {
  max-width: 50px;
  font-size: 0.66rem;
  text-align: center;
  overflow-wrap: anywhere;
}
.select {
  min-height: 38px;
  padding: 4px 8px;
  background: var(--bg-side);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  color: var(--ink);
  font: inherit;
  font-size: 0.86rem;
}
button:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
