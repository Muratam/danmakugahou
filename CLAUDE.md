# danmakugahou で作業するときの決まり

カードゲーム「東方弾幕画報」の最善手と確率の解析のリポジトリ。元の Nim のプログラム（ルートの `*.nim`・`per.txt`。2019 年）と、それを作り直した Web 版（`web/`。`/danmakugaho/` で配信）がある。ここにはこのアプリに特有の決まりだけを書く。

**先に読む**: 共通の決まり（禁止事項・作業の流れ・守ること）は `Muratam/sagisawa` の `CLAUDE.md`。サーバーの管理者AI は `/home/claude/sagisawa/CLAUDE.md` を、ほかの環境では GitHub か手元の clone を読む。
構成・デプロイ・テストのコマンドは `HANDOFF.md`。

## このアプリに特有のこと
- 既定のブランチは **master**（main ではない）。PR の `--base` も master。
- public のリポジトリ。ラボは https の公開 URL で pull する。
- 元のプログラム（ルートの `*.nim`・`per.txt`）は変えない。
- 計算（`web/src/engine/`）を変えたら `npm test` を通す。全探索・元の Nim の値・`per.txt` と照合する。ルールの解釈（`web/src/engine/charas.ts` の `card`）を変えるときは先に murata に聞き、`web/src/rulesNotes.ts` と `HANDOFF.md` の表も合わせる。
- リポジトリ名は `danmakugahou`、URL のパスは `/danmakugaho/`（綴りが違う）、ポートは 3180。
- 画面の色・面・線・文字は `web/src/style.css` のトークン（sagisawa のポータルと同じ）だけを使う。外部の CDN は使わない。処理はブラウザの中だけ（サーバー側の処理・保存は無い）。
- キャラの画像は `web/public/chara/`（一覧と推奨サイズは同じ場所の `README.md`）。murata が差し替える。
