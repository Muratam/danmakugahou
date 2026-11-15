<script setup lang="ts">
// 能力の表: 能力 1 つ（1 回）だけで各被写体を撮れる確率（ルールはカードの文面どおり）
import { computed, ref, watch } from "vue";
import { skillTable } from "../client";
import type { SkillTableRow } from "../engine/api";
import { CHARAS, CHARA_BY_ID, LEVELS } from "../engine/charas";
import CharaIcon from "./CharaIcon.vue";

const level = ref(5);
const help = ref(0);
const rows = ref<SkillTableRow[] | null>(null);
const busy = ref(false);
const err = ref("");
const sortKey = ref<"order" | "any" | "mean">("any");

const targets = computed(() => CHARAS.filter((c) => c.level === level.value));
let seq = 0;
watch(
  [level, help],
  async () => {
    const my = ++seq;
    busy.value = true;
    err.value = "";
    try {
      const r = await skillTable("card", level.value, help.value);
      if (my === seq) rows.value = r;
    } catch (e) {
      if (my === seq) err.value = e instanceof Error ? e.message : String(e);
    } finally {
      if (my === seq) busy.value = false;
    }
  },
  { immediate: true },
);
const mean = (r: SkillTableRow) => r.probs.reduce((a, b) => a + b, 0) / r.probs.length;
const sorted = computed(() => {
  const rs = (rows.value ?? []).filter((r) => r.user !== "");
  if (sortKey.value === "any") rs.sort((a, b) => b.any - a.any);
  else if (sortKey.value === "mean") rs.sort((a, b) => mean(b) - mean(a));
  return rs;
});
const base = computed(() => rows.value?.find((r) => r.user === ""));
const pct = (p: number) => (p * 100).toFixed(1);
const heat = (p: number) => `rgba(71, 200, 230, ${(0.04 + p * 0.4).toFixed(3)})`;
</script>

<template>
  <section
    class="panel"
    aria-label="能力の表"
  >
    <div class="panel-head">
      <h2>能力 1 つで撮れる確率</h2>
      <span
        v-if="busy"
        class="quiet small"
      >計算中…</span>
    </div>
    <div class="controls">
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
          :aria-pressed="level === lv"
          @click="level = lv"
        >
          Lv{{ lv }}
        </button>
      </div>
      <label class="ctl">ヘルプ
        <select
          v-model.number="help"
          class="select"
        >
          <option :value="0">0 枚</option>
          <option :value="1">1 枚</option>
          <option :value="2">2 枚</option>
        </select>
      </label>
      <label class="ctl">並び
        <select
          v-model="sortKey"
          class="select"
        >
          <option value="any">いずれかの高い順</option>
          <option value="mean">平均の高い順</option>
          <option value="order">レベル順</option>
        </select>
      </label>
    </div>
    <p class="quiet small">
      行 = 能力を 1 回だけ使えるキャラ、列 = レベル {{ level }} の各被写体を狙ったときの成功確率（%）。「いずれか」は振った後に撮れる人を選ぶとき（通常の撮影）。
    </p>
    <p
      v-if="err"
      class="err"
    >
      {{ err }}
    </p>
    <div
      v-if="rows"
      class="scroll"
      :class="{ stale: busy }"
    >
      <table>
        <thead>
          <tr>
            <th
              scope="col"
              class="user-h"
            >
              能力
            </th>
            <th
              v-for="t in targets"
              :key="t.id"
              scope="col"
              :title="`${t.fullName}: ${t.condText}`"
            >
              <CharaIcon
                :id="t.id"
                :size="24"
              />
              <span class="th-name">{{ t.name }}</span>
            </th>
            <th scope="col">
              平均
            </th>
            <th scope="col">
              いずれか
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-if="base"
            class="base"
          >
            <th scope="row">
              能力なし
            </th>
            <td
              v-for="(p, k) in base.probs"
              :key="k"
            >
              {{ pct(p) }}
            </td>
            <td>{{ pct(mean(base)) }}</td>
            <td class="any">
              {{ pct(base.any) }}
            </td>
          </tr>
          <tr
            v-for="r in sorted"
            :key="r.user"
          >
            <th
              scope="row"
              :title="CHARA_BY_ID.get(r.user)!.skillText"
            >
              <span class="user">
                <CharaIcon
                  :id="r.user"
                  :size="22"
                />
                {{ CHARA_BY_ID.get(r.user)!.name }}
              </span>
            </th>
            <td
              v-for="(p, k) in r.probs"
              :key="k"
              :style="{ background: heat(p) }"
            >
              {{ pct(p) }}
            </td>
            <td :style="{ background: heat(mean(r)) }">
              {{ pct(mean(r)) }}
            </td>
            <td
              class="any"
              :style="{ background: heat(r.any) }"
            >
              {{ pct(r.any) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.small {
  font-size: 0.78rem;
}
.err {
  color: var(--bad);
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  margin-bottom: 8px;
}
.levels {
  display: flex;
  gap: 4px;
}
.lv {
  min-height: 34px;
  padding: 0 10px;
  background: var(--bg-side);
  border: 1px solid var(--line-strong);
  border-bottom: 3px solid var(--c);
  border-radius: var(--radius-sm);
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
}
.lv[aria-pressed="true"] {
  background: var(--c);
  border-color: var(--c);
  color: var(--die-pip);
}
.ctl {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--ink-soft);
}
.select {
  min-height: 34px;
  padding: 2px 6px;
  background: var(--bg-side);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  color: var(--ink);
  font: inherit;
  font-size: 0.82rem;
}
.scroll {
  margin-top: 10px;
  overflow-x: auto;
  transition: opacity 0.2s;
}
.scroll.stale {
  opacity: 0.5;
}
table {
  border-collapse: collapse;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
th,
td {
  padding: 3px 8px;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}
thead th {
  vertical-align: bottom;
  font-weight: 600;
  color: var(--ink-sub);
}
thead th :deep(.chara) {
  display: flex;
  margin: 0 auto 2px;
}
.th-name {
  display: block;
  font-size: 0.72rem;
  text-align: center;
}
.user-h {
  text-align: left;
}
tbody th {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--surface);
  text-align: left;
  font-weight: 600;
}
.user {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
td {
  text-align: right;
}
td.any {
  font-weight: 700;
}
tr.base th,
tr.base td {
  color: var(--ink-soft);
  border-bottom-color: var(--line-strong);
}
</style>
