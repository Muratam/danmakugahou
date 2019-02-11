import sequtils,strutils,sugar,math,strformat,tables,algorithm
import lib
import gahoudata


# proc getIdentityGraph():Table[int,Table[int,float]] =
#   result = initTable[int,Table[int,float]]()
#   for src,_ in allDicePattern: result[src][src] = 1.0

# proc getSrcGraph(src:int):Table[int,Table[int,float]] =
#   result = initTable[int,Table[int,float]]()
#   result[src][src] = 1.0

# proc `*`(A:Table[int,float],B:Table[int,Table[int,float]]):Table[int,float] =
#   result = initTable[int,float]()
#   for mid,valA in A:
#     if mid notin B : continue
#     for dst,valB in B[mid]:
#       result[dst] = result.getOrDefault(dst,0.0) + (valA * valB)

# proc `*`(A,B:Table[int,Table[int,float]]):Table[int,Table[int,float]] =
#   result = initTable[int,Table[int,float]]()
#   for aSrc,aDsts in A: result[aSrc] = result[aSrc] * B

proc `*`(A,B:Table[int,seq[Table[int,float]]]):Table[int,seq[Table[int,float]]] =
  result = initTable[int,seq[Table[int,float]]]()
  for aSrc,aDstss in A: # 3000
    result[aSrc] = @[]
    for aDsts in aDstss: # 6(選択肢)
      for mid,aVal in aDsts: # 6(次の変更先)
        if mid notin B : continue
        var nextsBase = aDsts
        nextsBase.del mid
        for bDsts in B[mid]: #
          var nexts = nextsBase
          for dst,bVal in bDsts:
            nexts[dst] = nexts.getOrDefault(dst,0.0) + aVal * bVal
          result[aSrc] &= nexts

let identityGraph = (proc ():Table[int,seq[Table[int,float]]] =
  result = initTable[int,seq[Table[int,float]]]()
  for src,_ in allDicePattern: result[src] = @[@[(src,1.0)].toTable()]
)()
# 456 -> [{456:1.0},{455:0.3,...},...] # (最大6)パターン -> 選択肢 -> 可能性
let rerollGraph = (proc ():Table[int,seq[Table[int,float]]] =
  result = initTable[int,seq[Table[int,float]]]()
  for src,_ in allDicePattern:
    result[src] = @[]
    result[src] &= @[(src,1.0)].toTable() # 振りなおさない
    let srcArrBase = src.splitAsDecimal()
    for i in 0..<srcArrBase.len:
      if i > 0 and srcArrBase[i-1] == srcArrBase[i] : continue
      var nexts = initTable[int,float]()
      var dstArr = srcArrBase
      for d in 1..6:
        dstArr[i] = d
        let dst = dstArr.toKey()
        nexts[dst] = nexts.getOrDefault(dst,0.0) + (1.0 / 6.0)
      result[src] &= nexts
)()

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

let reroll2 = rerollGraph * rerollGraph
# let reroll3 = reroll2 * rerollGraph


proc getPercent(self:Chara):float = self.reduce(identityGraph)
proc getPercentWithReroll(self:Chara):float = self.reduce(rerollGraph)
proc getPercentWithReroll2(self:Chara):float = self.reduce(reroll2)
# proc getPercentWithReroll3(self:Chara):float = self.reduce(reroll3)


proc `$`*(self:Chara):string =
  return fmt"""
  LV{self.level} :
  {self.getPercent():.2f}% :
  {self.getPercentWithReroll():.2f}% :
  {self.getPercentWithReroll2():.2f}% :
  {self.getPercentWithReroll3():.2f}% :
  {self.name}""".replace("\n","")


for charas in charasByLevel:
  let level = charas[0].level
  let allLevel = newChara(fmt"LV{level}のいずれか",level,x => charas.anyIt(it.check(x)))
  for chara in charas: echo chara
  echo allLevel