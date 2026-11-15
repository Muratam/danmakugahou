<script setup lang="ts">
// キャラ 1 人の名前・撮影条件・能力（キャラの一覧と、解析・試行でアイコンに乗せたときの箱で使う）
import { computed } from "vue";
import { CHARA_BY_ID } from "../engine/charas";
import CharaIcon from "./CharaIcon.vue";

const props = withDefaults(defineProps<{ id: string; showLevel?: boolean }>(), { showLevel: false });
const c = computed(() => CHARA_BY_ID.get(props.id)!);
</script>

<template>
  <div class="chara-card">
    <CharaIcon
      :id="c.id"
      :size="32"
      no-title
    />
    <div class="c-body">
      <div class="c-name">
        {{ c.fullName }}<span
          v-if="showLevel"
          class="c-lv"
          :style="{ color: `var(--lv${c.level})` }"
        >Lv{{ c.level }}</span>
      </div>
      <div class="c-line">
        <span class="quiet">撮影条件</span> {{ c.condText }}
      </div>
      <div class="c-line">
        <span class="quiet">能力</span> {{ c.skillText }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.chara-card {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 10px;
}
.c-body {
  min-width: 0;
}
.c-name {
  font-weight: 650;
  font-size: 0.86rem;
}
.c-lv {
  margin-left: 8px;
  font-size: 0.74rem;
  font-weight: 700;
}
/* 文は折り返して全文を出す */
.c-line {
  font-size: 0.78rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
</style>
