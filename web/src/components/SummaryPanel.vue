<script setup lang="ts">
// 解いた結果: 目的の値と、被写体ごとの成功確率
import { computed } from "vue";
import { CHARA_BY_ID } from "../engine/charas";
import { fmtValue, isEdit, progress, setup, solveError, summary, ui } from "../state";
import CharaIcon from "./CharaIcon.vue";

const sorted = computed(() => [...(summary.value?.perTarget ?? [])].sort((a, b) => b.p - a.p));
const heldNames = computed(() => setup.value.held.map((id) => CHARA_BY_ID.get(id)!.name).join("・") || "なし");
const fmtMs = (ms: number) => (ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(1)} 秒`);
</script>

<template>
  <section
    class="panel"
    aria-label="結果"
  >
    <div class="panel-head">
      <h2>{{ isEdit ? "編集の期待値" : `レベル ${ui.level} の撮影` }}</h2>
      <span
        v-if="summary"
        class="quiet stat"
      >{{ fmtMs(summary.ms) }}・層 {{ summary.layers.toLocaleString() }}・状態 {{ summary.states.toLocaleString() }}</span>
    </div>
    <p
      v-if="solveError"
      class="err"
    >
      計算に失敗しました: {{ solveError }}
    </p>
    <p
      v-else-if="!isEdit && setup.targets.length === 0"
      class="quiet"
    >
      狙う被写体を 1 人以上選んでください。
    </p>
    <div
      v-else-if="summary"
      class="result"
      :class="{ stale: progress !== null }"
    >
      <div class="big">
        <span class="big-num">{{ fmtValue(summary.value) }}</span>
        <span class="big-label quiet">
          <template v-if="isEdit">一面と二面の合計（最善に能力を振り分けたとき）</template>
          <template v-else>{{ setup.targets.length > 1 ? "残りのどれか 1 人を撮れる確率" : "この 1 人を撮れる確率" }}（最善に操作したとき）</template>
        </span>
      </div>
      <p class="quiet small">
        能力: {{ heldNames }}<template v-if="!isEdit">
          ・ヘルプ {{ ui.help }} 枚
        </template>
      </p>
      <dl
        v-if="isEdit && summary.edit"
        class="edit-stats"
      >
        <div>
          <dt>能力を使わないとき（1 面）</dt>
          <dd>{{ fmtValue(summary.edit.noSkill) }}</dd>
        </div>
        <div>
          <dt>能力を全部二面に残したときの二面</dt>
          <dd>{{ fmtValue(summary.edit.backAll) }}</dd>
        </div>
      </dl>
      <ul
        v-if="sorted.length > 1"
        class="targets"
      >
        <li
          v-for="t in sorted"
          :key="t.id"
        >
          <CharaIcon
            :id="t.id"
            :size="26"
          />
          <span class="t-name">{{ CHARA_BY_ID.get(t.id)!.name }}<span class="quiet t-cond">{{ CHARA_BY_ID.get(t.id)!.condText }}</span></span>
          <span class="t-val">{{ fmtValue(t.p) }}</span>
          <span
            class="meter"
            aria-hidden="true"
          ><span :style="{ width: `${t.p * 100}%` }" /></span>
        </li>
      </ul>
      <p
        v-if="sorted.length > 1"
        class="quiet small"
      >
        各行はその 1 人だけを狙ったとき（ラストラウンド）の確率です。
      </p>
    </div>
    <p
      v-else
      class="quiet"
    >
      計算中…
    </p>
  </section>
</template>

<style scoped>
.stat {
  font-size: 0.74rem;
}
.err {
  color: var(--bad);
}
.small {
  font-size: 0.78rem;
}
.result {
  display: grid;
  gap: 10px;
  transition: opacity 0.2s;
}
.result.stale {
  opacity: 0.5;
}
.big {
  display: grid;
  gap: 2px;
}
.big-num {
  font-size: 2.6rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.big-label {
  font-size: 0.82rem;
}
.edit-stats {
  display: grid;
  gap: 4px;
  margin: 0;
}
.edit-stats div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.84rem;
}
.edit-stats dt {
  color: var(--ink-soft);
}
.edit-stats dd {
  margin: 0;
  font-weight: 600;
}
.targets {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.targets li {
  position: relative;
  display: grid;
  grid-template-columns: 26px 1fr auto;
  align-items: center;
  gap: 8px;
  padding-bottom: 5px;
}
.t-name {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 8px;
  min-width: 0;
  font-size: 0.86rem;
  font-weight: 600;
}
.t-cond {
  font-size: 0.72rem;
  font-weight: 400;
}
.t-val {
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.meter {
  position: absolute;
  left: 34px;
  right: 0;
  bottom: 0;
  height: 2px;
  background: var(--line);
}
.meter span {
  display: block;
  height: 100%;
  background: var(--accent);
}
</style>
