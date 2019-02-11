import sequtils,strutils,sugar,math,strformat,tables,algorithm
import lib
import gahoudata


# 最大で 1287 パターンしかない
let dicePatternByLevel = (proc (): seq[Table[int,int]] =
  const maxCount = 8
  result = newSeqWith(maxCount+1,initTable[int,int]())
  for i in 1..6:result[1][i] = 1
  for i in 2..maxCount:
    for k,v in result[i-1].pairs:
      let ks = k.splitAsDecimal()
      for k2 in 1..6:
        let nextKey = (ks & k2).toKey()
        result[i][nextKey] = result[i].getOrDefault(nextKey,0) + v
)()
# 456 -> 24 パターン
let allDicePattern = (proc():Table[int,int] =
  result = initTable[int,int]()
  for dices in dicePatternByLevel:
    for k,v in dices:
      result[k] = v
)()

# proc getIdentityGraph():Table[int,Table[int,float]] =
#   result = initTable[int,Table[int,float]]()
#   for src,_ in allDicePattern: result[src][src] = 1.0

# proc getSrcGraph(src:int):Table[int,Table[int,float]] =
#   result = initTable[int,Table[int,float]]()
#   result[src][src] = 1.0

proc `*`(A:Table[int,float],B:Table[int,Table[int,float]]):Table[int,float] =
  result = initTable[int,float]()
  for mid,valA in A:
    if mid notin B : continue
    for dst,valB in B[mid]:
      result[dst] = result.getOrDefault(dst,0.0) + (valA * valB)


proc `*`(A,B:Table[int,Table[int,float]]):Table[int,Table[int,float]] =
  result = initTable[int,Table[int,float]]()
  for aSrc,aDsts in A: result[aSrc] = result[aSrc] * B


# 456 -> [{456:1.0},{455:0.3,...},...]
let rerollGraph = (proc ():Table[int,seq[Table[int,float]]] =
  result = initTable[int,seq[Table[int,float]]]()
  for src,_ in allDicePattern:
    result[src] = @[]
    result[src] &= @[(src,1.0)].toTable() # 振りなおさない
    let srcArrBase = src.splitAsDecimal()
    for i in 0..<srcArrBase.len:
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

proc checkDice(self:Chara,k:int): bool = self.check(k.splitAsDecimal.toCounts())

proc getPercent(self:Chara):float=
  for k,v in rollDice(self.level):
    if self.checkDice(k) : result += v
  result *= 100.0

proc getPercentWithReroll(self:Chara):float=
  let rolled = rollDice(self.level)
  var dsts = newTable[int,float]()
  for k,v in rolled:
    var p = 0.0
    for vs in rerollGraph[k]:
      var p2 = 0.0
      for k2,v2 in vs:
        if self.checkDice(k2): p2 += v * v2
      p = p.max(p2)
    result += p
  result *= 100.0

proc `$`*(self:Chara):string =
  return fmt"LV{self.level} : {self.getPercent():.2f}% :{self.getPercentWithReroll():.2f} : {self.name}"


for charas in charasByLevel:
  let level = charas[0].level
  let allLevel = newChara(fmt"LV{level}のいずれか",level,x => charas.anyIt(it.check(x)))
  for chara in charas: echo chara
  echo allLevel
  break