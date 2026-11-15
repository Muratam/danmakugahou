<script setup lang="ts">
// 今の状態で取れる行動の一覧。行 = 確定・各キャラの能力・ヘルプ。各行は最善の選択肢と、その後を最善に進めたときの値
// （撮影なら成功確率、編集なら評価点の期待値）。開くと全部の選択肢。
import { computed, ref } from "vue";
import { CHARA_BY_ID } from "../engine/charas";
import type { ActionGroup, ActionOption } from "../engine/solver";
import { fmtValue } from "../state";
import CharaIcon from "./CharaIcon.vue";

const props = withDefaults(defineProps<{ groups: ActionGroup[]; pickable?: boolean; scale?: number; expandAll?: boolean }>(), { pickable: false, scale: 1, expandAll: false });
const emit = defineEmits<{ pick: [option: ActionOption, who: string] }>();

const EPS = 1e-12;
const rows = computed(() =>
  props.groups
    .filter((g) => g.options.length > 0)
    .map((g) => ({ g, best: g.options[0] }))
    .sort((a, b) => b.best.value - a.best.value || (a.g.who === "stop" ? -1 : b.g.who === "stop" ? 1 : 0)),
);
const top = computed(() => (rows.value.length ? rows.value[0].best.value : 0));
const open = ref<Record<string, boolean>>({});
const name = (who: string) => (who === "stop" ? "確定" : who === "help" ? "ヘルプ" : CHARA_BY_ID.get(who)?.name ?? who);
const width = (v: number) => `${Math.max(0, Math.min(1, v / props.scale)) * 100}%`;
const unusable = computed(() => props.groups.filter((g) => g.options.length === 0 && g.who !== "stop").map((g) => name(g.who)));
</script>

<template>
  <ul class="actions">
    <li
      v-for="{ g, best } in rows"
      :key="g.who"
      class="row"
      :class="{ best: best.value >= top - EPS }"
    >
      <div class="main">
        <span class="who">
          <CharaIcon
            v-if="g.who !== 'stop' && g.who !== 'help'"
            :id="g.who"
            :size="28"
          />
          <span
            v-else
            class="glyph"
            aria-hidden="true"
          >{{ g.who === "stop" ? "■" : "↻" }}</span>
          <span class="who-name">{{ name(g.who) }}</span>
        </span>
        <button
          type="button"
          class="opt"
          :disabled="!pickable"
          @click="emit('pick', best, g.who)"
        >
          <span class="opt-label">{{ best.label }}</span>
          <span class="val">{{ fmtValue(best.value) }}</span>
          <span
            class="meter"
            aria-hidden="true"
          ><span :style="{ width: width(best.value) }" /></span>
        </button>
        <button
          v-if="g.options.length > 1 && !expandAll"
          type="button"
          class="more"
          :aria-expanded="!!open[g.who]"
          :title="`ほかの選択肢 ${g.options.length - 1} 個`"
          @click="open[g.who] = !open[g.who]"
        >
          {{ open[g.who] ? "閉じる" : `+${g.options.length - 1}` }}
        </button>
      </div>
      <ul
        v-if="open[g.who] || expandAll"
        class="others"
      >
        <li
          v-for="(o, k) in g.options.slice(1)"
          :key="k"
        >
          <button
            type="button"
            class="opt"
            :disabled="!pickable"
            @click="emit('pick', o, g.who)"
          >
            <span class="opt-label">{{ o.label }}</span>
            <span class="val">{{ fmtValue(o.value) }}</span>
            <span
              class="meter"
              aria-hidden="true"
            ><span :style="{ width: width(o.value) }" /></span>
          </button>
        </li>
      </ul>
    </li>
    <li
      v-if="unusable.length"
      class="unusable quiet"
    >
      今は使えない能力: {{ unusable.join("・") }}
    </li>
  </ul>
</template>

<style scoped>
.actions {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.row {
  padding: 4px 6px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--bg-side);
}
.row.best {
  border-color: rgba(71, 200, 230, 0.45);
}
.main {
  display: grid;
  grid-template-columns: 112px 1fr auto;
  align-items: center;
  gap: 8px;
}
.who {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.who-name {
  overflow: hidden;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  color: var(--ink-soft);
  font-size: 0.8rem;
}
.opt {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  min-width: 0;
  min-height: 34px;
  padding: 4px 8px 7px;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--ink);
  font: inherit;
  text-align: left;
}
.opt:not(:disabled) {
  cursor: pointer;
}
.opt:not(:disabled):hover {
  border-color: var(--line-strong);
  background: var(--surface-2);
}
.opt:disabled {
  color: var(--ink);
}
.opt-label {
  flex: 1;
  min-width: 0;
  font-size: 0.84rem;
  overflow-wrap: anywhere;
}
.val {
  flex: none;
  font-size: 0.86rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.best > .main .val {
  color: var(--accent);
}
.meter {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 3px;
  height: 2px;
  background: var(--line);
  border-radius: 1px;
}
.meter span {
  display: block;
  height: 100%;
  background: var(--ink-faint);
  border-radius: 1px;
}
.best > .main .meter span {
  background: var(--accent);
}
.more {
  min-width: 44px;
  min-height: 30px;
  padding: 0 6px;
  background: none;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.74rem;
  cursor: pointer;
}
.more:hover {
  color: var(--ink);
}
.others {
  display: grid;
  gap: 2px;
  margin: 4px 0 2px 120px;
  padding: 0;
  list-style: none;
}
.unusable {
  padding: 2px 6px;
  font-size: 0.76rem;
}
@media (max-width: 520px) {
  .main {
    grid-template-columns: 30px 1fr auto;
  }
  .who-name {
    display: none;
  }
  .others {
    margin-left: 38px;
  }
}
</style>
