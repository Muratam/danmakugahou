<script setup lang="ts">
// ダイスの面（SVG）。1 の目だけ赤（日本のダイスと同じ）
import { computed } from "vue";

const props = withDefaults(defineProps<{ value: number; size?: number; mark?: "new" | "gone" | null }>(), { size: 40, mark: null });

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
};
const pips = computed(() => PIPS[props.value] ?? []);
</script>

<template>
  <svg
    class="die"
    :class="mark ? `die-${mark}` : undefined"
    viewBox="0 0 100 100"
    :width="size"
    :height="size"
    role="img"
    :aria-label="`${value} の目`"
  >
    <rect
      x="4"
      y="4"
      width="92"
      height="92"
      rx="18"
      class="face"
    />
    <circle
      v-for="([x, y], k) in pips"
      :key="k"
      :cx="x"
      :cy="y"
      :r="value === 1 ? 14 : 9"
      :class="value === 1 ? 'pip-one' : 'pip'"
    />
  </svg>
</template>

<style scoped>
.die {
  flex: none;
  display: block;
}
.face {
  fill: var(--die-face);
  stroke: var(--die-edge);
  stroke-width: 3;
}
.pip {
  fill: var(--die-pip);
}
.pip-one {
  fill: var(--die-pip-one);
}
/* 振って足した・変えたダイス */
.die-new .face {
  stroke: var(--accent);
  stroke-width: 8;
}
.die-gone {
  opacity: 0.35;
}
</style>
