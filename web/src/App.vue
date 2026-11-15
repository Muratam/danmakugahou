<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import AboutView from "./components/AboutView.vue";
import AppIcon from "./components/AppIcon.vue";
import ExplorePanel from "./components/ExplorePanel.vue";
import SetupPanel from "./components/SetupPanel.vue";
import SummaryPanel from "./components/SummaryPanel.vue";
import TableView from "./components/TableView.vue";
import TrialView from "./components/TrialView.vue";

// ページ。URL の #/<ページ> と対応させる
type Page = "analyze" | "trial" | "table" | "about";
const tabs: { id: Page; label: string }[] = [
  { id: "analyze", label: "解析" },
  { id: "trial", label: "試行" },
  { id: "table", label: "能力の表" },
  { id: "about", label: "説明" },
];
const page = ref<Page>("analyze");

function parseHash() {
  const p = location.hash.replace(/^#\/?/, "");
  page.value = tabs.find((t) => t.id === p)?.id ?? "analyze";
}
function go(p: Page) {
  const hash = `#/${p}`;
  if (location.hash !== hash) location.hash = hash;
  page.value = p;
}
onMounted(() => {
  parseHash();
  window.addEventListener("hashchange", parseHash);
});
onBeforeUnmount(() => window.removeEventListener("hashchange", parseHash));
</script>

<template>
  <header class="bar">
    <div class="bar-inner">
      <!-- 1 段: 印とタイトル → ページのタブ（下線。stegano・akochan と同じ形）→ 右端に GitHub -->
      <button
        type="button"
        class="brand"
        @click="go('analyze')"
      >
        <span
          class="mark"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
          >
            <circle
              cx="4"
              cy="4"
              r="1.7"
            />
            <circle
              cx="12"
              cy="4"
              r="1.7"
            />
            <circle
              cx="8"
              cy="8"
              r="1.7"
            />
            <circle
              cx="4"
              cy="12"
              r="1.7"
            />
            <circle
              cx="12"
              cy="12"
              r="1.7"
            />
          </svg>
        </span>
        <span class="name">弾幕画報 解析</span>
      </button>
      <nav
        class="tabs"
        aria-label="ページ"
      >
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          class="tab"
          :aria-current="page === t.id ? 'page' : undefined"
          @click="go(t.id)"
        >
          {{ t.label }}
        </button>
      </nav>
      <a
        class="gh"
        href="https://github.com/Muratam/danmakugahou"
        aria-label="GitHub"
        title="GitHub"
      >
        <AppIcon name="github" />
      </a>
    </div>
  </header>

  <main class="main">
    <div
      v-show="page === 'analyze' || page === 'trial'"
      class="cols"
    >
      <SetupPanel class="side" />
      <div class="content">
        <!-- 試行の途中の状態はタブを移っても残す -->
        <template v-if="page === 'analyze'">
          <SummaryPanel />
          <ExplorePanel />
        </template>
        <SummaryPanel v-if="page === 'trial'" />
        <TrialView v-show="page === 'trial'" />
      </div>
    </div>
    <TableView v-if="page === 'table'" />
    <AboutView v-if="page === 'about'" />
  </main>
</template>

<style scoped>
/*
 * 上の帯（1 段）。タブの見た目は Muratam/stegano_pixelart の App.vue と同じ値（akochan・tetris と同じ揃え方）
 */
.bar {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
}
.bar-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 1240px;
  min-height: 48px;
  margin: 0 auto;
  padding: 0 8px 0 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
  padding: 0;
  background: none;
  border: 0;
  color: var(--ink);
  font: inherit;
  cursor: pointer;
}
.mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  color: var(--accent);
}
.mark svg {
  fill: currentColor;
}
.name {
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: 0.03em;
  white-space: nowrap;
}
.tabs {
  display: flex;
  flex: 1;
  min-width: 0;
  align-self: stretch;
  margin-bottom: -1px;
  overflow-x: auto;
  scrollbar-width: none;
}
.tab {
  flex: 1;
  min-height: 48px;
  padding: 0 4px;
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--ink-soft);
  font: inherit;
  font-size: 0.9rem;
  white-space: nowrap;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.tab:hover {
  color: var(--ink);
}
.tab[aria-current="page"] {
  color: var(--ink);
  font-weight: 600;
  border-bottom-color: var(--accent);
}
.gh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: none;
  margin-left: auto;
  color: var(--ink-soft);
  border-radius: var(--radius-sm);
}
.gh:hover {
  color: var(--ink);
  background: var(--surface-2);
}
.gh .icon {
  width: 18px;
  height: 18px;
}
/* スマホ: タイトルの文字は隠して印だけ（読み上げには残す） */
@media (max-width: 699px) {
  .name {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
}
@media (max-width: 420px) {
  .bar-inner {
    gap: 6px;
    padding: 0 6px 0 10px;
  }
  .tab {
    padding: 0 2px;
    font-size: 0.86rem;
  }
}
@media (min-width: 700px) {
  .bar-inner {
    gap: 16px;
    min-height: 56px;
    padding: 0 16px;
  }
  .tabs {
    flex: 0 1 auto;
  }
  .tab {
    flex: none;
    min-height: 56px;
    padding: 0 16px;
  }
}
.main {
  display: grid;
  gap: 16px;
  max-width: 1240px;
  margin: 0 auto;
  padding: 16px 16px 48px;
}
.cols {
  display: grid;
  gap: 16px;
  align-items: start;
}
.content {
  display: grid;
  gap: 16px;
  min-width: 0;
}
@media (min-width: 960px) {
  .cols {
    grid-template-columns: minmax(340px, 400px) minmax(0, 1fr);
  }
  .side {
    position: sticky;
    top: 72px;
    max-height: calc(100vh - 88px);
    overflow-y: auto;
  }
}
</style>
