import sequtils,strutils,sugar,math,strformat,tables,algorithm,intSets
import lib
import skill
import gahoudata

# WARN: 10ダイスまで
# let reroll2 = skillGraphs[0] * skillGraphs[0]
# let reroll3 = reroll2 * rerollGraph

proc rollDice(level:int):Table[int,float] =
  let denom = 6.power(level).float
  result = initTable[int,float]()
  for k,v in dicePatternByLevel[level]: result[k] = v.float / denom
proc reduce(self:Chara,graph:Table[int,seq[Table[int,float]]]) : float=
  let rolled = rollDice(self.level)
  for k,v in rolled:
    var p = 0.0
    for vs in graph[k]:
      var p2 = 0.0
      for k2,v2 in vs:
        if self.checkDice(k2): p2 += v * v2
      p = p.max(p2)
    result += p
  result *= 100.0

for charas in charasByLevel:
  let level = charas[0].level
  let allLevel = newChara(fmt"LV{level}のいずれか",level,x => charas.anyIt(it.check(x)),rerollFunc(true))
  var means = newSeq[float]()
  var alls = newSeq[float]()
  for skills in allCharas:
    means &= charas.mapIt(it.reduce(skills.skill).int).sum() / (charas.len)
    alls &= allLevel.reduce(skills.skill)
  echo "LEVEL ",level
  echo means.mapIt(fmt"{99.min(it.int):2d}%").join(" ")
  echo alls.mapIt(fmt"{99.min(it.int):2d}%").join(" ")
