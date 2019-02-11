import sequtils,strutils,sugar,math,strformat,tables,algorithm,intSets,random,times
import lib
import skill
import gahoudata
template stopwatch(body) = (let t1 = cpuTime();body;stderr.writeLine "TIME:",(cpuTime() - t1) * 1000,"ms")

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

let nopGraph = notImplementedSkill.skillToGraph()
proc reduceGraphs(self:Chara,graphs:seq[Graph]) : float =
  if graphs.len == 0 : return self.reduceGraph(nopGraph)
  if graphs.len == 1 : return self.reduceGraph(graphs[0])
  if graphs.len >= 3 : quit "NOT IMPLEMENTED"
  let rolled = rollDiceGraph(self.level)
  proc calc(k:int) : float =
    prettyPrint graphs[0][k]
    prettyPrint graphs[1][k]
  for k,v in rolled: result += calc(k) * v
  result *= 100.0
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