<script setup lang="ts">
// キャラ: 全員の撮影条件と能力（レベルごと）
import { CHARAS, LEVELS } from "../engine/charas";
import CharaCard from "./CharaCard.vue";
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <h2>キャラの一覧</h2>
    </div>
    <div class="prose">
      <div
        v-for="lv in LEVELS"
        :key="lv"
        class="lv-block"
      >
        <h3 :style="{ color: `var(--lv${lv})` }">
          レベル {{ lv }}
        </h3>
        <ul class="charas">
          <li
            v-for="c in CHARAS.filter((x) => x.level === lv)"
            :key="c.id"
          >
            <CharaCard :id="c.id" />
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.prose h3 {
  margin: 8px 0 4px;
  font-size: 0.84rem;
}
.charas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px 16px;
  padding: 0 !important;
  list-style: none;
}
.charas li {
  margin: 0 !important;
}
</style>
