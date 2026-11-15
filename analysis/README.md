# analysis（T411）

元の Nim の reduceGraphs の値と時間を測るための補助。Web 版のテスト（`web/test/nim.test.ts`）の照合値はこれで作った。

- bench: `main.nim` の `proc showCharas` より前の部分 + `bench_tail.nim` をつなげてビルドする
  `head -n $(( $(grep -n '^proc showCharas' main.nim | cut -d: -f1) - 1 )) main.nim | cat - analysis/bench_tail.nim > <作業用のディレクトリ>/bench.nim`
- 使い方: `./bench <対象> <持っているキャラ…>` → 成功確率（%）と BitDP の時間
- 照合値の作り方: `lib.nim` の `diceMaxCount` を 10 にし（13 だと読み込みだけで 7 GB を超えて終わらない）、末尾を「標準入力の 1 行ずつ <対象> <キャラ…> を読んで reduceGraphs の値を出す」形にしてビルドする。枝刈りを外した版（exact）は reduceGraphs の `if n <= approximateThreshold: … continue` の 4 行を消したもの
- Nim 1.2.18、C コンパイラは zig cc。読み込み 40 秒・3.5 GB

## 測った数（2026-11-15）

| 条件 | 元の Nim（diceMaxCount 10） | Web 版（層 DP） |
|---|---|---|
| 紫 ← リグル・アリス・咲夜・永琳・輝夜 | 0.14 s（読み込み 37 s・2.8 GB）、62.6134%（枝刈りあり）／62.6956%（なし） | 0.07 s、62.6956% |
| 紫 ← リグル・アリス・パチュリー・永琳・輝夜 | 16 s 以上・9 GB 超で中止 | 0.03〜0.12 s、54.8592% |
| Lv8 いずれか ← 8 人（パチュリー・天子・美鈴・衣玖・小町を含む）・ヘルプ 3 | — | 1.7 s |
| Lv8 いずれか ← 12 人・ヘルプ 2 | 計算しない（n > 10） | 14 s |

Web 版の数は `cd web && PERF=1 PERF_OUT=<出力> npx vitest run test/perf.test.ts`（Node 26、6 コアの 1 コア）。
