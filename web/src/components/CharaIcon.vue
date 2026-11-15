<script setup lang="ts">
// キャラのアイコン。public/chara/<id>.png（.webp・.jpg も可）があればそれを、無ければキャラの色の丸に名前の頭の文字を入れる。
// 丸の縁はカードの枠の色（レベル）。画像の置き場所と一覧は public/chara/README.md。
import { computed, ref, watch } from "vue";
import { CHARA_BY_ID } from "../engine/charas";
import { imageMissing } from "../state";
import files from "virtual:chara-images";

const props = withDefaults(defineProps<{ id: string; size?: number }>(), { size: 36 });
const ch = computed(() => CHARA_BY_ID.get(props.id));

// 読めなかった画像は覚えておき、同じ id でもう一度取りにいかない（ページの間で共有）
const missing = imageMissing;
const failed = ref(missing.has(props.id) || !files[props.id]);
watch(
  () => props.id,
  (id) => (failed.value = missing.has(id) || !files[id]),
);
function onError() {
  missing.add(props.id);
  failed.value = true;
}
const src = computed(() => `${import.meta.env.BASE_URL}chara/${files[props.id]}`);

// 丸の色が明るいときは文字を暗く
const ink = computed(() => {
  const hex = ch.value?.color ?? "#888888";
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? "var(--die-pip)" : "var(--ink)";
});
</script>

<template>
  <span
    class="chara"
    :style="{ width: `${size}px`, height: `${size}px`, '--ring': `var(--lv${ch?.level ?? 3})`, '--fill': ch?.color, '--ink-c': ink }"
    :title="ch?.fullName"
  >
    <img
      v-if="!failed"
      :src="src"
      :alt="ch?.name"
      :width="size"
      :height="size"
      loading="lazy"
      @error="onError"
    >
    <span
      v-else
      class="initial"
      :style="{ fontSize: `${Math.round(size * 0.46)}px` }"
      aria-hidden="true"
    >{{ ch?.name.slice(0, 1) }}</span>
  </span>
</template>

<style scoped>
.chara {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--fill);
  border: 2px solid var(--ring);
  border-radius: 50%;
}
.chara img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: var(--surface-2);
}
.initial {
  color: var(--ink-c);
  font-weight: 700;
  line-height: 1;
}
</style>
