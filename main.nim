import sequtils,strutils,sugar,math,strformat,tables,algorithm,intSets,random,times
import lib
import skill
import gahoudata
template `max=`*(x,y) = x = max(x,y)
template `min=`*(x,y) = x = min(x,y)
template stopwatch(body) = (let t1 = cpuTime();body;stderr.writeLine "TIME:",(cpuTime() - t1) * 1000,"ms")
proc `^`(n:int) : int{.inline.} = (1 shl n)

# WARN: ダイス数に注意

proc rollDice(level:int): int =
  var random = initRand((cpuTime() * 1000000).int)
  var dices = newSeq[int]()
  for _ in 0..<level: dices &= 1 + (random.next() mod 6).int
  return dices.toKey()

proc rollDiceGraph(level:int):Table[int,float] =
  let denom = 6.power(level).float
  result = initTable[int,float]()
  for k,v in dicePatternByLevel[level]: result[k] = v.float / denom
proc reduceGraph(self:Chara,graph:Graph) : float=
  let rolled = rollDiceGraph(self.level)
  proc calc(k:int):float =
    # 各開始ロールに対して確率が最大になるように遷移を選択したい
    for vs in graph[k]:
      var p = 0.0
      for k2,v2 in vs: # その選択をした場合の期待値
        if self.checkDice(k2): p += v2
      result = result.max(p)
      if abs(result - 1.0) < 1e-8 : return 1.0 # 確定
  for k,v in rolled: result += calc(k) * v
  result *= 100.0

# Tableから脱却
type Edge = tuple[dst:int,val:float]
type RevNode = seq[tuple[e:Edge,others:seq[Edge]]]
type RevGraph = seq[RevNode]
proc compressPattern(patterns:seq[int]):Table[int,int]=
  # 少ないパターンしかないのでTableを脱却する
  # 逆方向は patterns[3] == 345 のようにそのまま
  result = initTable[int,int]()
  for i,p in patterns: result[p] = i

proc getRevGraph(graph:Graph,pTable:Table[int,int],pSize:int): RevGraph =
  # BASE : 123 -> [{122:0.5 123:0.5},{123:1.0}...]
  # REV  : 122 -> [(dst:123,val:0.5,others:{})]
  result = newSeq[RevNode](pSize)
  for src,dests in graph:
    if src notin pTable : continue
    for dest in dests:
      var ok = true
      for d,val in dest: # 対象範囲外のパターンに行く可能性
        if d notin pTable: ok = false
      if not ok : continue
      let pDest = toSeq(dest.pairs).mapIt((pTable[it[0]],it[1])).toTable()
      for d,val in pDest:
        var revDest = pDest
        revDest.del d
        result[d] &= ((pTable[src],val),toSeq(revDest.pairs))

let nopGraph = notImplementedSkill.skillToGraph()

# key だったとき(かつ0~^nまでの状態の時)に次に行うべき選択肢番号(=キャラ番号)とその場合の取れる確率
type BackTrack = tuple[next,nextDice:int,val:float]
proc reduceGraphs(self:Chara,charas:seq[Chara]):
    tuple[back:Table[int,seq[BackTrack]],expected:float] =
  var backTable = initTable[int,seq[BackTrack]]()
  var n = charas.len
  if n == 0 : return (backTable,self.reduceGraph(nopGraph))
  if n > 10 : return (backTable,0.0) # 1秒以上かかるし多分死ぬ
  let maxDiff = charas.mapIt(it.diceDiff.max(0)).sum()
  let minDiff = charas.mapIt(it.diceDiff.min(0)).sum()
  # ダイスの増減分しか探索しなくてよい
  let mayPattern = (proc():seq[int] =
    result = @[]
    for dices in dicePatternByLevel[self.level + minDiff..self.level+maxDiff]:
      for k in dices.keys: result &= k
  )()
  let pTable = mayPattern.compressPattern()
  let pSize = mayPattern.len
  let revGraphs = charas.mapIt(it.skillGraph.getRevGraph(pTable,pSize))
  var dp = newSeq[seq[float]](pSize)
  # 使ったスキルの数とそれに対応する０以外の頂点
  var P = newSeqWith(^n,newSeq[bool](pSize))
  # 何も使わなくても行ける場所
  for i,p in mayPattern:
    dp[i] = newSeq[float](^n)
    if p in self.okPattern :
      dp[i][0] = 1.0
      P[0][i] = true
  const approximateThreshold = 7
  const eps = 1e-12
  # O(n*2^n*...)
  for i in 0 ..< ^n: # BitDPで確定させていく
    for gi in 0..<n: # gi番目を埋めて(i or ^gi)にする
      if (i and ^gi) > 0 : continue
      let nextIndex = i or ^gi
      for src in 0..<pSize:
        if not P[i][src] : continue # 確定済みの地点から伸ばす
        for D in revGraphs[gi][src]:
          var per = dp[src][i] * D.e.val
          for other in D.others:
            per += dp[other.dst][i] * other.val
          # 0 % だった
          if per <= eps : continue
          # すでに自分を使わなくてもよりよい解があるなら探索候補に入れる必要はない
          let hereMax = dp[D.e.dst].max()
          dp[D.e.dst][nextIndex] .max= per
          if n <= approximateThreshold:
            if per < hereMax: continue
          else: # 枝刈りする(近似であり,結果は少しだけ過小評価される)
            if per < hereMax + eps: continue
          P[nextIndex][D.e.dst] = true
  let answers = toSeq(dp.pairs).mapIt((k:it[0],v:it[1].max())).toTable()
  let rolled = rollDiceGraph(self.level)
  var expected = 0.0
  for k,v in rolled:
    expected += answers[pTable[k]] * v
    backTable[k] = newSeq[BackTrack](^n)
    # dp で 1 が立ってる -> それを使える
    for i in 0 ..< ^n:
      backTable[k][i] = (-1,0,0.0)
      for j in 0 ..< n :
        if (i and ^j) == 0 : continue
        # キャラjを使った時の選択肢の中で最も成功確率の大きいものを選ぶ
        for dest in charas[j].skillGraph[k]:
          var exp = 0.0
          var ok = true
          for key,val in dest:
            if key notin pTable:
              ok = false
              break
            exp += val * dp[pTable[key]][i and (not ^j)]
          if not ok : continue
          if exp < backTable[k][i].val : continue
          backTable[k][i] = (j,toSeq(dest.keys)[0],exp)
  expected *= 100.0
  return (backTable,expected)

proc remiriaTest() =
  # @["アリス", "てゐ", "にとり", "メルラン", "リリカ"]でレミリアを取る場合(61%)の指針のテスト
  let target = charasByLevel[4][0] # 12以下
  let charas = charasByLevel[2][0..4]
  let(back,expected) = target.reduceGraphs(charas)
  var rolled = rollDice(target.level)
  echo expected
  echo charas.mapIt(it.name)
  var S = ^(charas.len) - 1
  for i in 0..<charas.len:
    echo rolled
    echo back[rolled][S]
    let (next,nextDice,val) = back[rolled][S]
    S = S and (not ^next)
    rolled = stdin.readLine.parseInt()


  if true: quit 0
proc showCharas() =
  for charas in charasByLevel:
    let level = charas[0].level
    if level < 3 : continue
    for chara in charas: echo chara.name, " : ", chara.skillGraph.len," -> ", toSeq(chara.skillGraph.pairs).mapIt(it[1].mapIt(toSeq(it.pairs).len)).mapIt(it.sum()).sum()

  for charas in charasByLevel:
    let level = charas[0].level
    if level < 3 : continue
    let allLevel = newChara(fmt"←のうちのどれか",level,0,x => charas.anyIt(it.check(x)),rerollFunc(false))
    echo "\nLEVEL ",level,"を取れる確率"
    for target in charas & allLevel:
      stdout.write target.name," : "
    echo ""
    for skillUser in allCharas:
      for target in charas & allLevel:
        stdout.write (target.reduceGraph(skillUser.skillGraph)).int , "% : "
      echo skillUser.name


var R = random.initRand((cpuTime()*1000).int)
proc adventure() =
  # 1人でLV3からはじめて,リトライ・振り直しカードなしでLV8まで(同じLVの撮影をせずに)進めて最後の写真の点数を競う
  var currentLevel = 3
  var gotCharas = newSeq[Chara]()
  while true:
    let currentCharas = if currentLevel == 9 : charasByLevel[7] else: allCharas.filterIt(it.level == currentLevel)
    echo "現在のLVは",currentLevel,"です."
    if gotCharas.len > 0:
      echo "現在の取得キャラは ",gotCharas.mapIt(it.name).join(",")," です."
    echo currentCharas.mapIt(it.name).join(","),"の取得に挑戦できます."
    echo "現在のそれぞれの取得確率は以下のとおりです."
    let percents = currentCharas.mapIt(it.reduceGraphs(gotCharas)[1])
    for i,chara in currentCharas:
      echo fmt"  {percents[i]:.2f}% : {chara.name}"
    if currentLevel < 8:
      echo "取った場合の次のLVの最大取得確率は以下のとおりです"
      for i,chara in currentCharas:
        let nextCharas = allCharas.filterIt(it.level == currentLevel + 1)
        echo fmt"  {nextCharas.mapIt(it.reduceGraphs(gotCharas & chara)[1]).max():.2f}% : {chara.name}"
    echo ".................ダイスをロールしています...................."
    let canGets = toSeq(0..<currentCharas.len).filterIt(R.rand(100.0) < percents[it])
    if canGets.len == 0 :
      echo "残念ながら誰も取得できませんでした..."
      echo "1からやり直しましょう"
      discard stdin.readLine
      return
    if currentLevel == 9:
      echo "今回の冒険の結果は",currentCharas[canGets.max()].name,"でした！"
      discard stdin.readLine
      return
    while true:
      echo "ダイスを振っていい感じに頑張った結果,以下が取れそうです.番号を入力してください."
      for i in canGets:
        echo fmt"  {i} : {currentCharas[i].name}"
      let S = stdin.readLine
      try:
        let n = S.parseInt()
        if n == 9 :
          echo "冒険をやり直します"
          return
        if n notin canGets: continue
        gotCharas &= currentCharas[n]
        currentLevel += 1
        break
      except: continue
while true:
  adventure()