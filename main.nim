import sequtils,strutils,sugar,math,strformat,tables,algorithm,intSets,random,times
import lib
import skill
import gahoudata
# import nimprof
template `max=`*(x,y) = x = max(x,y)
template `min=`*(x,y) = x = min(x,y)
template stopwatch(body) = (let t1 = cpuTime();body;stderr.writeLine "TIME:",(cpuTime() - t1) * 1000,"ms")
proc `^`(n:int) : int{.inline.} = (1 shl n)

# WARN: ダイス数に注意
# let reroll2 = skillGraphs[0] * skillGraphs[0]
# let reroll3 = reroll2 * rerollGraph

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

type RevNode = seq[tuple[dst:int,val:float,others:Dest]]
type RevGraph = Table[int,RevNode]
proc getRevGraph(graph:Graph): RevGraph =
  # BASE : 123 -> [{122:0.5 123:0.5},{123:1.0}...]
  # REV  : 122 -> [(dst:123,val:0.5,others:{})]
  result = initTable[int,RevNode]()
  for src,dests in graph:
    for dest in dests:
      for d,val in dest:
        var revDest = dest
        revDest.del d
        if d notin result : result[d] = @[]
        result[d] &= (src,val,revDest)

let nopGraph = notImplementedSkill.skillToGraph()
proc reduceGraphs(self:Chara,charas:seq[Chara]) : float =
  let n = charas.len
  if n == 0 : return self.reduceGraph(nopGraph)
  if n == 1 : return self.reduceGraph(charas[0].skillGraph)
  var dp = newTable[int,seq[float]]()
  let revGraphs = charas.mapIt(it.skillGraph.getRevGraph())
  let maxDiff = charas.mapIt(it.diceDiff.max(0)).sum()
  let minDiff = charas.mapIt(it.diceDiff.min(0)).sum()
  # ダイスの増減分しか探索しなくてよい
  let mayPattern = (proc():seq[int] =
    result = @[]
    for dices in dicePatternByLevel[self.level + minDiff..self.level+maxDiff]:
      for k in dices.keys: result &= k
  )()
  # 何も使わなくても行ける場所
  var P = newSeqWith(^n,newSeq[int]()) # 使ったスキルの数とそれに対応する０以外の頂点
  for p in mayPattern:
    dp[p] = newSeq[float](^n)
    if p in self.okPattern :
      dp[p][0] = 1.0
      P[0] &= p
  const eps = 1e-8
  for i in 0 ..< ^n: # BitDPで確定させていく
    for gi in 0..<n: # gi番目を埋めて(i or ^gi)にする
      if (i and ^gi) > 0 : continue
      for src in P[i]: # 確定済みの地点から伸ばす
        if src notin revGraphs[gi] : continue
        for D in revGraphs[gi][src]: # dst val others
          if D.dst notin dp : continue # 増やす / 減らす系が対象外の場所を見ることがあるので
          var per = dp[src][i] * D.val
          for otherK,otherV in D.others:
            per += dp[otherK][i] * otherV
          # 0 % だった
          if per <= eps : continue
          # すでに自分を使わなくてもよりよい解があるなら探索候補に入れる必要はない
          if per < dp[D.dst].max() - eps : continue
          dp[D.dst][i or ^gi] .max= per
          P[i or ^gi] &= D.dst
  let answers = toSeq(dp.pairs).mapIt((k:it[0],v:it[1].max())).toTable()
  let rolled = rollDiceGraph(self.level)
  for k,v in rolled: result += answers[k] * v
  result *= 100.0


let arith = charasByLevel[2][0]
let cirno = charasByLevel[1][0]
for i in 0..5:
  let charas = charasByLevel[2][0..i]
  echo charas.len
  stopWatch:
    echo arith.reduceGraphs(charas)
if true : quit 0


proc rollDice(level:int): int =
  var random = initRand((cpuTime() * 1000000).int)
  var dices = newSeq[int]()
  for _ in 0..<level: dices &= 1 + (random.next() mod 6).int
  return dices.toKey()
proc montecarloReduce(self:Chara,skillGraph:Graph) : float =
  const montecarloCount = 10000
  for _ in 0..<montecarloCount:
    let dice = rollDice(self.level)
    if self.checkDice(dice) :
      result += 1.0 / montecarloCount
      continue
    if dice notin skillGraph : continue
    var p = 0.0
    for vs in skillGraph[dice]:
      var p2 = 0.0
      for k2,v2 in vs:
        if self.checkDice(k2): p2 += v2
      p = p.max(p2)
    result += p / montecarloCount
  result *= 100.0

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