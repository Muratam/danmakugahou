<script setup lang="ts">
// アイコン・名前に乗せたときの箱（出す・消すは src/charaTip.ts）。画面の中に収め、下に入らなければ上に出す
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { TIP_ID, tip } from "../charaTip";
import CharaCard from "./CharaCard.vue";

const box = ref<HTMLElement | null>(null);
const pos = ref({ left: 0, top: 0, ready: false });
const GAP = 6;
const EDGE = 8;

async function place() {
  pos.value = { ...pos.value, ready: false };
  await nextTick();
  const a = tip.anchor;
  const b = box.value;
  if (!a || !b) return;
  const r = a.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const w = b.offsetWidth;
  const h = b.offsetHeight;
  const left = Math.min(Math.max(EDGE, r.left + r.width / 2 - w / 2), Math.max(EDGE, vw - w - EDGE));
  const below = r.bottom + GAP;
  const above = r.top - GAP - h;
  // 下に入らず、上に入るなら上。どちらにも入らなければ広い方に寄せて画面の中に収める
  let top = below;
  if (below + h > vh - EDGE) top = above >= EDGE ? above : Math.max(EDGE, Math.min(below, vh - h - EDGE));
  pos.value = { left, top, ready: true };
}
watch(() => [tip.id, tip.anchor], place);
const onScroll = () => {
  if (tip.anchor) place();
};
onMounted(() => window.addEventListener("scroll", onScroll, { capture: true, passive: true }));
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll, { capture: true }));
</script>

<template>
  <Teleport to="body">
    <div
      v-if="tip.id"
      :id="TIP_ID"
      ref="box"
      class="chara-tip"
      role="tooltip"
      :style="{ left: `${pos.left}px`, top: `${pos.top}px`, visibility: pos.ready ? 'visible' : 'hidden' }"
    >
      <CharaCard
        :id="tip.id"
        show-level
      />
    </div>
  </Teleport>
</template>

<style scoped>
.chara-tip {
  position: fixed;
  z-index: 30;
  width: max-content;
  max-width: min(340px, calc(100vw - 16px));
  padding: 10px 12px;
  background: var(--surface-3);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
  color: var(--ink);
  font-size: 15px;
  line-height: 1.65;
}
</style>
