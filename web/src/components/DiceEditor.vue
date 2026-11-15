<script setup lang="ts">
// ダイスの目を入れる: 下の 1〜6 で足し、上のダイスを押すと除く
import DieFace from "./DieFace.vue";

const dice = defineModel<number[]>({ required: true });
const props = withDefaults(defineProps<{ max?: number }>(), { max: 13 });

function add(v: number) {
  if (dice.value.length >= props.max) return;
  dice.value = [...dice.value, v].sort((a, b) => a - b);
}
function removeAt(k: number) {
  const d = [...dice.value];
  d.splice(k, 1);
  dice.value = d;
}
</script>

<template>
  <div class="editor">
    <div
      class="current"
      aria-label="今のダイス（押すと除く）"
    >
      <button
        v-for="(v, k) in dice"
        :key="k"
        type="button"
        class="die-btn"
        :title="`${v} を除く`"
        @click="removeAt(k)"
      >
        <DieFace
          :value="v"
          :size="36"
        />
      </button>
      <span
        v-if="dice.length === 0"
        class="quiet empty"
      >下の目を押してダイスを足します</span>
    </div>
    <div
      class="adds"
      aria-label="足す目"
    >
      <button
        v-for="v in 6"
        :key="v"
        type="button"
        class="add-btn"
        :title="`${v} を足す`"
        :disabled="dice.length >= max"
        @click="add(v)"
      >
        <DieFace
          :value="v"
          :size="26"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor {
  display: grid;
  gap: 8px;
}
.current {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 44px;
}
.empty {
  font-size: 0.8rem;
}
.die-btn,
.add-btn {
  padding: 0;
  background: none;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}
.die-btn:hover {
  opacity: 0.6;
}
.adds {
  display: flex;
  gap: 6px;
}
.add-btn {
  padding: 4px;
  border: 1px dashed var(--line-strong);
}
.add-btn:hover {
  border-color: var(--accent);
}
.add-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
</style>
