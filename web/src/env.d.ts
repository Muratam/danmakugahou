/// <reference types="vite/client" />

declare module "virtual:chara-images" {
  /** id → public/chara/ のファイル名（vite.config.ts の charaImages） */
  const files: Record<string, string>;
  export default files;
}
