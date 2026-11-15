<script setup lang="ts">
// 状態を調べる: ダイスの目・まだ使える能力・残りのヘルプを入れると、各行動の値（その後を最善に進めたとき）を出す
import { computed, ref, watch } from "vue";
import { query } from "../client";
import { CHARA_BY_ID } from "../engine/charas";
import type { StateAnswer } from "../engine/session";
import { fmtValue, isEdit, rollDie, setup, summary, ui } from "../state";
import ActionList from "./ActionList.vue";
import CharaIcon from "./CharaIcon.vue";
import DiceEditor from "./DiceEditor.vue";

const dice = ref<number[]>([]);
const used = ref<string[]>([]);
const helpLeft = ref(ui.help);
const phase = ref<"front" | "back">("front");
const answer = ref<StateAnswer | null>(null);
const err = ref("");

const L = computed(() => setup.value.level);
function roll() {
  dice.value = Array.from({ length: L.value }, rollDie).sort((a, b) => a - b);
}
watch(L, roll, { immediate: true });
watch(
  () => ui.help,
  (h) => (helpLeft.value = h),
);
watch(
  () => setup.value.held,
  (held) => (used.value = used.value.filter((id) => held.includes(id))),
);

const U = computed(() => setup.value.held.reduce((m, id, k) => (used.value.includes(id) ? m : m | (1 << k)), 0));
function toggleUsed(id: string) {
  const i = used.value.indexOf(id);
  if (i >= 0) used.value.splice(i, 1);
  else used.value.push(id);
}

let seq = 0;
watch(
  [summary, dice, U, helpLeft, phase],
  async () => {
    const my = ++seq;
    err.value = "";
    if (!summary.value) {
      answer.value = null;
      return;
    }
    try {
      const a = await query(setup.value, { phase: phase.value, U: U.value, h: isEdit.value ? 0 : Math.min(helpLeft.value, setup.value.help), dice: dice.value });
      if (my === seq) answer.value = a;
    } catch (e) {
      if (my === seq) err.value = e instanceof Error ? e.message : String(e);
    }
  },
  { deep: true },
);
const scale = computed(() => (isEdit.value ? Math.max(1, ...(answer.value?.groups.flatMap((g) => g.options.map((o) => o.value)) ?? [1])) : 1));
</script>

<template>
  <section
    class="panel"
    aria-label="状態を調べる"
  >
    <div class="panel-head">
      <h2>状態を調べる</h2>
      <div class="tools">
        <button
          type="button"
          class="btn"
          @click="roll"
        >
          {{ L }} 個振る
        </button>
      </div>
    </div>
    <div class="grid">
      <div
        v-if="isEdit"
        class="seg"
        role="group"
        aria-label="面"
      >
        <button
          type="button"
          :aria-pressed="phase === 'front'"
          @click="phase = 'front'"
        >
          一面
        </button>
        <button
          type="button"
          :aria-pressed="phase === 'back'"
          @click="phase = 'back'"
        >
          二面
        </button>
      </div>
      <DiceEditor v-model="dice" />
      <div
        v-if="setup.held.length"
        class="field"
      >
        <span class="field-label">まだ使える能力（押すと「使った」）</span>
        <div class="chips">
          <button
            v-for="id in setup.held"
            :key="id"
            type="button"
            class="chip"
            :aria-pressed="!used.includes(id)"
            @click="toggleUsed(id)"
          >
            <CharaIcon
              :id="id"
              :size="22"
            />
            {{ CHARA_BY_ID.get(id)!.name }}
          </button>
        </div>
      </div>
      <div
        v-if="!isEdit && ui.help > 0"
        class="field"
      >
        <span class="field-label">残りのヘルプ</span>
        <div class="chips">
          <button
            v-for="h in ui.help + 1"
            :key="h"
            type="button"
            class="chip count"
            :aria-pressed="helpLeft === h - 1"
            @click="helpLeft = h - 1"
          >
            {{ h - 1 }} 枚
          </button>
        </div>
      </div>
      <p
        v-if="err"
        class="err"
      >
        {{ err }}
      </p>
      <template v-else-if="answer">
        <p
          v-if="!Number.isFinite(answer.value)"
          class="quiet"
        >
          この組み合わせ（ダイスの数と使った能力）は起こりません。ダイスの数を合わせてください。
        </p>
        <template v-else>
          <p class="now">
            この状態から最善に進めたとき: <strong>{{ fmtValue(answer.value) }}</strong>
          </p>
          <ActionList
            :groups="answer.groups"
            :scale="scale"
          />
        </template>
      </template>
    </div>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  gap: 12px;
}
.tools {
  display: flex;
  gap: 6px;
}
.tools .btn {
  min-height: 32px;
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
  min-height: 30px;
  padding: 0 14px;
  background: none;
  border: 0;
  border-radius: 3px;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
}
.seg button[aria-pressed="true"] {
  background: var(--surface-3);
  color: var(--ink);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 2px 10px 2px 4px;
  background: var(--bg-side);
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--ink-faint);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  text-decoration: line-through;
}
.chip[aria-pressed="true"] {
  border-color: var(--line-strong);
  background: var(--surface-2);
  color: var(--ink);
  text-decoration: none;
}
.chip.count {
  padding-left: 10px;
  text-decoration: none;
}
.now {
  font-size: 0.9rem;
}
.now strong {
  color: var(--accent);
  font-size: 1.1rem;
}
.err {
  color: var(--bad);
}
</style>
