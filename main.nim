import sequtils,strutils,sugar,math,strformat,tables,algorithm,intSets,random,times
import lib
import skill
import gahoudata
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
proc reduceGraphs(self:Chara,graphs:seq[Graph]) : float =
  if graphs.len == 0 : return self.reduceGraph(nopGraph)
  if graphs.len == 1 : return self.reduceGraph(graphs[0])
  let allPattern = toSeq(allDicePattern.keys)
  let n = graphs.len
  var dp = newTable[int,seq[float]]()
  let revGraphs = graphs.mapIt(it.getRevGraph())
  var P = newSeqWith(^n,newSeq[int]()) # 使ったスキルの数とそれに対応する０以外の頂点
  # 何も使わなくても行ける場所
  for p in allPattern:
    dp[p] = newSeq[float](^n)
    if p in self.okPattern :
      dp[p][0] = 1.0
      P[0] &= p
  # type Dest* = Table[int,float]
  # type Dests* = seq[Dest]
  # type Graph* = Table[int,Dests]
  const eps = 1e-8
  for i in 0 ..< ^n: # BitDPで確定させていく
    for gi in 0..<n: # gi番目を埋めて(i or ^gi)にする
      # i == 0b01 && gi == 1
      if (i and ^gi) > 0 : continue
      let revGraph = revGraphs[gi]
      for src in P[i]: # 確定済みの地点から伸ばす
        if src notin revGraph : continue
        for D in revGraph[src]:
          # dst val others
          var per = dp[src][i] * D.val
          for otherK,otherV in D.others:
            per += dp[otherK][i] * otherV
          if per <= eps : continue
          dp[D.dst][i or ^gi] .max= per
          P[i or ^gi] &= D.dst
let arith = charasByLevel[2][0]
let cirno = charasByLevel[1][0]
echo arith.reduceGraphs(@[arith.skillGraph,cirno.skillGraph])
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
  let allLevel = newChara(fmt"←のうちのどれか",level,x => charas.anyIt(it.check(x)),rerollFunc(false))
  echo "\nLEVEL ",level,"を取れる確率"
  for target in charas & allLevel:
    stdout.write target.name," : "
  echo ""
  for skillUser in allCharas:
    for target in charas & allLevel:
      stdout.write (target.reduceGraph(skillUser.skillGraph)).int , "% : "
    echo skillUser.name