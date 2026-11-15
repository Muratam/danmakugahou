import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vitest/config";
import vue from "@vitejs/plugin-vue";

// public/chara/ に置いたキャラの画像（<id>.png・.webp・.jpg）の一覧を、ビルドのときに読む（無い画像を取りにいかないため）。
// 画像を足したら、ビルドし直す（開発用のサーバーは開き直す）
function charaImages(): Plugin {
  const id = "virtual:chara-images";
  const dir = fileURLToPath(new URL("./public/chara/", import.meta.url));
  return {
    name: "chara-images",
    resolveId: (s) => (s === id ? "\0" + id : null),
    load(s) {
      if (s !== "\0" + id) return null;
      const map: Record<string, string> = {};
      for (const f of readdirSync(dir).sort()) {
        const m = /^([a-z]+)\.(png|webp|jpg|jpeg)$/.exec(f);
        if (m && !map[m[1]]) map[m[1]] = f;
      }
      return `export default ${JSON.stringify(map)};`;
    },
  };
}

export default defineConfig({
  // 公開のパス（https://sagisawa.0am.jp/danmakugaho/）。nginx の設定（docker/nginx.conf）と合わせる
  base: "/danmakugaho/",
  plugins: [vue(), charaImages()],
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
