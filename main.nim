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
  for k,v in rolled:
    var p = 0.0
    for vs in graph[k]:
      var p2 = 0.0
      for k2,v2 in vs:
        if self.checkDice(k2): p2 += v * v2
      p = p.max(p2)
    result += p
  result *= 100.0

proc reduceGraphs(self:Chara,graphs:seq[Graph]) : float =
  0.0

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
  let allLevel = newChara(fmt"LV{level}のいずれか",level,x => charas.anyIt(it.check(x)),rerollFunc(false))
  var means = newSeq[float]()
  var alls = newSeq[float]()
  for skills in allCharas:
    stdout.write "."
    stdout.flushFile
    means &= charas.mapIt(it.reduceGraph(skills.skillGraph).int).sum() / (charas.len)
    alls &= allLevel.reduceGraph(skills.skillGraph)
  echo ""
  echo "LEVEL ",level
  for it in 0..<allCharas.len:
    echo fmt"{99.min(means[it].int):2d}%","\t",fmt"{99.min(alls[it].int):2d}%","\t",allCharas[it].name
