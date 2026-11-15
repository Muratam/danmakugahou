# 東方弾幕画報 解析

カードゲーム「東方弾幕画報」で、持っている能力とヘルプから撮影の成功確率・編集の評価点の期待値を計算し、各状態の最善手を示すツールです。

## Web 版

https://sagisawa.0am.jp/danmakugaho/ （ブラウザだけで動きます）

- 解析: 条件（レベル・狙う被写体・能力を使えるキャラ・ヘルプの枚数）から、最善に操作したときの成功確率。ダイスの目と残りの能力を入れると、各行動の値
- 試行: ダイスを振り、確率を見ながら 1 手ずつ進める
- 能力の表: 能力 1 つで各被写体を撮れる確率（`per.txt` と同じ形）

計算は層ごとの後ろ向きの動的計画法で、近似はありません。元の Nim の BitDP では時間とメモリが足りなかったパチュリーを含む組も 0.1 秒ほどで出ます。ルールはカードの文面どおりを既定にし、元の Nim と同じ扱い（照合用）も選べます。違いは画面の「説明」と `HANDOFF.md`。
カードの能力の表は [danmakugahou.js](https://github.com/Muratam/danmakugahou.js) も参考にしました。

```sh
cd web
npm ci
npm run dev      # 開発用のサーバー（http://localhost:5173/danmakugaho/）
npm test         # 全探索・元の Nim・per.txt との照合
npm run build    # dist/
```

## 元のプログラム（Nim、2019 年）

`main.nim`・`skill.nim`・`gahoudata.nim`・`lib.nim`。Nim 1.2 で `nim c -d:release main.nim`。`per.txt` は 2019-02-11 の版の出力（能力 1 つで各レベルを撮れる確率）。
