# analysis（WIP: T411）

Nim の reduceGraphs の時間とメモリを測るための補助。

- bench: `main.nim` の `proc showCharas` より前の部分 + `bench_tail.nim` をつなげてビルドする
  `head -n $(( $(grep -n '^proc showCharas' main.nim | cut -d: -f1) - 1 )) main.nim | cat - analysis/bench_tail.nim > /tmp/bench.nim`
- 使い方: `./bench <対象> <持っているキャラ…>` → 成功確率（%）と BitDP の時間
- 測った数と改善の方針: web/ の実装時に README に移す予定
