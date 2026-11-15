# 引き継ぎメモ（danmakugahou）

構成（事実）・デプロイ・残作業。作業の決まりは `CLAUDE.md`。サーバーの事実は `Muratam/sagisawa-admin` の `inventory.md`。事実は古くなるので、使う前に実物で確認する。

## 1. 全体像

| 項目 | 場所 |
|---|---|
| 公開 | https://sagisawa.0am.jp/danmakugaho/ （public: ログインなし。予定） |
| リポジトリ | GitHub `Muratam/danmakugahou`（public、既定のブランチ master）。管理者AI のワーキングコピーは `/home/claude/danmakugahou` |
| push | 管理者AI はこのリポジトリ専用のデプロイキー（ssh の Host `github-danmaku`）。ラボの `apps` は https の公開 URL で pull だけ |
| 動く場所 | ラボの `apps` の `/srv/danmakugahou/`、compose のプロジェクト `danmakugahou`、`10.44.135.10:3180`（予定） |

URL のパスは `/danmakugaho/`（リポジトリ名と綴りが違う。`web/vite.config.ts` の `base`・`docker/nginx.conf`・`scripts/smoke.sh`・`web/index.html` の OGP で合わせる）。

## 2. アプリ
- **構成**: 元の Nim のプログラムはルート（`*.nim`・`per.txt`。そのまま。配信には使わない）。Web 版は `web/`（Vue 3 + Vite + TypeScript の静的サイト。Muratam/stegano_pixelart と同じ形）。
  - `web/src/engine/`: 計算。`multiset.ts`（0〜13 個の多重集合 27,132 通りの番号と、1 個足す・除く の表）・`table.ts`（値の表と演算 R〔1 個振って足す期待値〕・A〔好きな目を足す最大〕・C〔1 個を好きな目に変える最大〕）・`charas.ts`（36 人の撮影条件と能力の選択肢。ルール card・nim・nim2019）・`solver.ts`（層 DP と、状態ごとの行動の値）・`api.ts`（撮影・編集・能力の表）・`session.ts`（Worker の中で解いた結果を持つ）
  - 画面: `web/src/App.vue`（タブ: 解析・試行・能力の表・説明）、`components/`。共有の設定は `state.ts`（localStorage に保存。読み込みと検査は `setupStore.ts`。能力を使えるキャラは 10 人まで〔`MAX_HELD`。計算の側は 12 人まで: `solver.ts` の `MAX_CHARAS`〕、レベル・ヘルプは整数で範囲内でなければ既定に戻す）。試行の進め方は `trial.ts`（始めたときの設定のコピーで問い合わせ、設定が変わったら止める）。重い処理は Web Worker（`web/src/worker.ts`、呼ぶ側は `client.ts`）
  - キャラの画像: `web/public/chara/<id>.png`（一覧・推奨サイズは `web/public/chara/README.md`）。ビルドのときに一覧を読む（`vite.config.ts` の `charaImages`）。無いキャラはキャラの色の丸に頭の文字
  - 配信は nginx のコンテナ（`Dockerfile`・`docker/nginx.conf`。uid 10001、読み取り専用、JS・CSS・HTML はビルド時に gzip、`/danmakugaho/assets/` は immutable）。サーバー側の処理・DB・シークレットは無い
- **計算**: 層 = (まだ使っていない能力の組 U, 残りのヘルプの枚数 h)。値 V[U][h](S) = max(確定の値, 各能力の各選択肢の値〔子の層の表を引く〕, ヘルプで 1 個振り直す値)。U の要素の少ない順に層をまるごと計算し、層はその層で起こるダイスの個数の範囲だけを持つ。能力の選択肢は「除く目・決めて足す目・その後の手順（R・A・C の列）」の形で、値は子の層の表に演算を掛けた表を 1 回引くだけ（パチュリーは R を k 回）。近似なし。編集は二面の期待値を U ごとに先に出し（どの U からでも 8 個で始められるよう層の範囲を広げる）、一面の確定の値を「評価点 + 二面の期待値」にして同じ計算
- **ルールの解釈**（既定はカードの文面どおり。条件の「ルールの解釈」で元の Nim と同じ扱い・2019 年の版にもできる。画面の「説明」に同じ表）:

| 対象 | カードの文面 | この解析（既定） | 元の Nim |
|---|---|---|---|
| 妖夢 | ダイス 1 個の出目を半分の値（切捨て）に変える。0 になったダイスは除外する | どの目でも選べる（2→1、4→2、6→3、1 は除外） | 奇数の目だけ（1 は除外、3→1、5→2） |
| 天子 | ダイス 1 個を振りなおす。その後、ダイス 1 個の出目を任意の値に変える | 振った目を見てから、変えるダイスと値を選ぶ | 変えるダイスと値を振る前に決める（値は小さめに出る） |
| 神奈子 | ダイスを 2 個振って追加する。その後、ダイス 2 個の出目をそれぞれ任意の値に変える | 振った目を見てから、変えるダイス（足したものも含む）と値を選ぶ | 変えるダイスと値を振る前に決める |
| 妹紅 | ダイス 2 個の出目に +1 する、またはダイス 1 個の出目に +2 する | +2 は 6 で止める（5 → 6）。フランの -2 を 1 で止める（Nim と同じ）のに合わせた | 6.max(it + 2) なので 1〜4 は全部 6 になり、5・6 には使えない（min の書き誤りと思われる） |
| フランドール | ダイス 2 個の出目に -1 する、またはダイス 1 個の出目に -2 する | -2 は 1 で止める（2 → 1）。-1 は 1 には使えない | 同じ |
| 藍（撮影条件） | 出目が 2 種類 | ちょうど 2 種類（全部同じ目は含まない） | 2 種類以下（全部同じ目も含む） |
| ±1 の能力 | メルラン +1、ルナサ -1、永琳 -1 と +1、チルノ・ミスティア、フラン・妹紅の ±1 | 目が 1〜6 の外に出る使い方はできない（6 に +1、1 に -1 は不可） | 同じ。2019 年の版（per.txt）だけは 1 に -1 すると 0 になってダイスが消える |
| 早苗・チルノ・ミスティアなど「ダイス 2 個」 | 出目が 5 のダイス 2 個の出目を…／出目が 4〜6 のダイス 2 個の出目に -1… | 条件に合うダイスが 2 個ないと使えない | 同じ |
| 映姫 | 1〜6 の各出目のダイス 6 個を一組として、その内 4 個の出目をそれぞれ任意の値に変える | 1〜6 が全部出ているときだけ。組は 1 つ（12 個あっても 2 組にはしない） | 同じ |
| 撮影の目的 | 出目が確定してから、そのレベルの被写体を 1 人選ぶ（ラストラウンドは先に選ぶ） | 「残りのどれか 1 人」を最大にする。1 人だけ選ぶとラストラウンドと同じ | 1 人ずつ |

- **元の Nim との違い**: reduceGraphs の枝刈り（能力 7 人以下で「per < hereMax なら先に伸ばさない」）は最善の道を落とすことがあり、少し小さい値を出す（紫 ← リグル・アリス・咲夜・永琳・輝夜 で 62.6134% → 枝刈りを外すと 62.6956%、Web 版も 62.6956%）。2019 年の版（per.txt）は、咲夜と魔理沙の能力が逆・美鈴・衣玖・小町・天子・神奈子は能力なし・目が 0 になったダイスは消える（ルナサ・永琳・フランの -1、妖夢の 1）
- **画面**: sagisawa のポータルと同じトークンのダークテーマ（`web/src/style.css`。足したのはダイスの面の色とカードの枠の色 `--lv3`〜`--lv8`）。幅 960px 以上で 2 列（左に条件）、それ未満は 1 列。スマホ縦（390×844）で横にはみ出さないこと

## 3. テスト
- `cd web && npm run lint`・`npm test`（vitest、約 10 秒）・`npm run build`（`vue-tsc --noEmit` と `vite build`）
- `web/test/engine.test.ts`: 層 DP と素朴な全探索（`web/test/brute.ts`。ダイスの列をキーにした再帰）の一致（撮影 20 組・3 つのルール・ヘルプ 0〜2、編集 3 組）、能力の個数の増減の宣言、ヘルプ 1 枚 = アリス、閉じた式
- `web/test/nim.test.ts`: ルール nim で元の Nim（diceMaxCount 10 でビルド、枝刈りを外した版）の値と相対誤差 1e-12 以内で一致（14 組。天子・神奈子・パチュリー・映姫・妖夢・妹紅を含む）。枝刈りありの値以上であること。作り方は `analysis/README.md`
- `web/test/per.test.ts`: ルール nim2019 で `per.txt` を一字一句再現
- `web/test/setup.test.ts`: 保存した設定の壊れた値・範囲外・人数の上限、計算の側の入力の検査。`web/test/trial.test.ts`: 試行が始めたときの設定のコピーで進むこと、途中で条件が変わった・計算に失敗したら止まること
- 計測: `PERF=1 PERF_OUT=<出力の .md> npx vitest run test/perf.test.ts`（数は `analysis/README.md`）
- 配信: `scripts/smoke.sh [ベースの URL]`（health が `{"ok":true}`、`/danmakugaho/` と、それが読む `/danmakugaho/assets/` の JS・CSS が 200、`/danmakugaho` が `/danmakugaho/` へ転送、OGP のメタと og.png が 1200×630）。ラボでは `scripts/smoke.sh http://10.44.135.10:3180`、公開後は `scripts/smoke.sh https://sagisawa.0am.jp`
- 画面: 試行 → 「7 個振って始める」→「最善手で 1 手進める」を数回で、撮影成功か失敗が出ること
- リンクのカードの画像: `web/public/og.png`。作り直しは `scripts/og-image.mjs` の先頭の手順

## 4. デプロイ
master にマージしてから（PR）、ラボで `scripts/deploy-lab.sh`。`/danmakugaho/api/health` が 200 を返すことを確認する。
- murata: `sudo incus exec --project user-1001 apps -- /srv/danmakugahou/scripts/deploy-lab.sh`
- 管理者AI: `incus exec apps -- /srv/danmakugahou/scripts/deploy-lab.sh`
- 公開: `sagisawa-expose add danmakugaho 10.44.135.10:3180 --kind public`

## 5. 残作業（初回の配置）
1. この変更を master にマージする（PR）
2. ラボで clone: `incus exec apps -- git clone https://github.com/Muratam/danmakugahou.git /srv/danmakugahou`
3. 初回のデプロイ: `incus exec apps -- /srv/danmakugahou/scripts/deploy-lab.sh` → `incus exec apps -- /srv/danmakugahou/scripts/smoke.sh http://10.44.135.10:3180`（Docker のイメージのビルドはここで初めて確認する）
4. 公開（新しいポート・public なので murata の了承の後）: `sudo -n /usr/local/sbin/sagisawa-expose add danmakugaho 10.44.135.10:3180 --kind public` → `scripts/smoke.sh https://sagisawa.0am.jp`
5. `Muratam/sagisawa-admin` の `inventory.md` に追記する。ポータル・ホームのアプリの一覧に載せるかは murata に聞く
