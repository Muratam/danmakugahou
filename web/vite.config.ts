import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  // 公開のパス（https://sagisawa.0am.jp/danmakugaho/）。nginx の設定（docker/nginx.conf）と合わせる
  base: "/danmakugaho/",
  plugins: [vue()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  worker: {
    format: "es",
  },
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout: 120_000,
  },
});
