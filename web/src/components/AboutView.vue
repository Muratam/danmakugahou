<script setup lang="ts">
// 説明: 使い方・計算のしかた・ルールの解釈（カードの文面どおり）
import { CHARAS, LEVELS } from "../engine/charas";
import { RULE_NOTES } from "../rulesNotes";
import CharaIcon from "./CharaIcon.vue";
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <h2>説明</h2>
    </div>
    <div class="prose">
      <p>
        同人のカードゲーム「東方弾幕画報」（2〜5 人。ダイスを振り、撮影に成功した被写体の能力で出目を操作する）の、最善手と確率を計算するツールです。計算はすべてブラウザの中で行います。
      </p>

      <h3>使い方</h3>
      <ul>
        <li><strong>解析</strong>: 左で条件（撮影か編集か・レベル・狙う被写体・能力を使えるキャラ・ヘルプの枚数）を選ぶと、最善に操作したときの成功確率（編集は評価点の期待値）が出ます。「状態を調べる」にダイスの目と、まだ使える能力を入れると、各行動を選んだときの値が出ます。</li>
        <li><strong>試行</strong>: 実際にダイスを振り、行動を 1 手ずつ選んで進めます。どの行も「その手を選んでから最善に進めたときの値」です。「最善手で 1 手進める」で最善の手を選びます。</li>
        <li><strong>能力の表</strong>: 能力 1 つを 1 回だけ使えるときに、各レベルの被写体を撮れる確率の一覧です。</li>
      </ul>

      <h3>計算のしかた</h3>
      <ul>
        <li>ダイスの目は並びを区別しない（多重集合）ので、0〜13 個の多重集合 27,132 通りに番号を付け、1 個足す・1 個除く の表で移ります。</li>
        <li>「まだ使っていない能力の組」と「残りのヘルプの枚数」ごとに、全部の多重集合の値を表にして、使える能力の少ない方から順に計算します（後ろ向きの動的計画法）。各状態の値は「ここで確定」「各能力の各選択肢」「ヘルプで 1 個振り直す」の最大です。近似はありません。</li>
        <li>ランダムに振るもの（振り直し・振って追加）は、1 個ずつ足す期待値の表を作って共有します。パチュリーのように多くのダイスを振り直す能力も、表を引く 1 回で済みます。振った後に選ぶもの（天子・神奈子）は「1 個を好きな目に変えたときの最大」の表で表します。</li>
        <li>編集は、二面の期待値を「残っている能力の組」ごとに先に出し、一面の確定の値を「一面の評価点 + 残りの能力での二面の期待値」にして同じ計算をします。</li>
        <li>確認したこと: 小さな全探索と一致（30 通り以上の組）。</li>
      </ul>

      <h3>ルールの解釈</h3>
      <p>
        ルールはカードの文面どおりです。文面だけでは決まらない所は、次のように読みました。
      </p>
      <div class="scroll">
        <table class="notes">
          <thead>
            <tr>
              <th scope="col">
                対象
              </th>
              <th scope="col">
                カードの文面
              </th>
              <th scope="col">
                この解析での読み方
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="n in RULE_NOTES"
              :key="n.who"
            >
              <th scope="row">
                {{ n.who }}
              </th>
              <td>{{ n.card }}</td>
              <td>{{ n.ours }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>キャラの一覧</h3>
      <div
        v-for="lv in LEVELS"
        :key="lv"
        class="lv-block"
      >
        <h4 :style="{ color: `var(--lv${lv})` }">
          レベル {{ lv }}
        </h4>
        <ul class="charas">
          <li
            v-for="c in CHARAS.filter((x) => x.level === lv)"
            :key="c.id"
          >
            <CharaIcon
              :id="c.id"
              :size="32"
            />
            <div>
              <div class="c-name">
                {{ c.fullName }}
              </div>
              <div class="c-line">
                <span class="quiet">撮影条件</span> {{ c.condText }}
              </div>
              <div class="c-line">
                <span class="quiet">能力</span> {{ c.skillText }}
              </div>
            </div>
          </li>
        </ul>
      </div>

      <h3>出典</h3>
      <ul>
        <li>ルールとカードの文面: 東方弾幕画報の配布ページ（ルールと印刷用のカードシート）</li>
        <li>元の解析: Muratam/danmakugahou の Nim のプログラム（2019 年）。<code>danmakugahou.js</code> の表も参考にしました</li>
        <li>東方 Project は上海アリス幻樂団の作品です。キャラのアイコンは AI（Gemini）で生成した二次創作の絵です。<code>chara/</code> の画像を置き換えると差し替わります</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.prose h4 {
  margin: 8px 0 4px;
  font-size: 0.84rem;
}
.scroll {
  overflow-x: auto;
}
.notes {
  border-collapse: collapse;
  min-width: 520px;
  font-size: 0.8rem;
}
.notes th,
.notes td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
}
.notes thead th {
  color: var(--ink-sub);
}
.notes tbody th {
  white-space: nowrap;
}
.charas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px 16px;
  padding: 0 !important;
  list-style: none;
}
.charas li {
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: 10px;
  margin: 0 !important;
}
.c-name {
  font-weight: 650;
  font-size: 0.86rem;
}
.c-line {
  font-size: 0.78rem;
  line-height: 1.5;
}
</style>
