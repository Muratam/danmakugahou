import sequtils,strutils,sugar,math,strformat,tables,algorithm
import lib
import gahoudata


# 最大で 1287 パターンしかない
let dicesByLV = (proc (): seq[Table[int,int]] =
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
let allDices = (proc():Table[int,int] =
  result = initTable[int,int]()
  for dices in dicesByLV:
    for k,v in dices:
      result[k] = v
)()

proc getIdentityGraph():Table[int,Table[int,float]] =
  result = initTable[int,Table[int,float]]()
  for src,_ in allDices: result[src][src] = 1.0

proc getSrcGraph(src:int):Table[int,Table[int,float]] =
  result = initTable[int,Table[int,float]]()
  result[src][src] = 1.0

proc getReroleGraph():Table[int,Table[int,float]] =
  result = initTable[int,Table[int,float]]()
  for src,_ in allDices:
    result[src] = initTable[int,float]()
    result[src][src] = 1.0 # 使わなかった方がよい場合もあるわけで
    let srcArrBase = src.splitAsDecimal()
    for i in 0..<srcArrBase.len:
      var dstArr = srcArrBase
      for d in 1..6:
        dstArr[i] = d
        let dst = dstArr.toKey()
        result[src][dst] = result[src].getOrDefault(dst,0.0).max(1 / 6)

proc mul(A,B:Table[int,Table[int,float]]):Table[int,Table[int,float]] =
  result = initTable[int,Table[int,float]]()
  for aSrc,aDsts in A:
    for aDst,valA in aDsts:
      if aDst notin B : continue
      for bDst,valB in B[aDst]:
        result[aSrc][bDst] = result[aSrc].getOrDefault(bDst,0.0) + valA * valB

proc rollDice(level:int):Table[int,float] =
  result = initTable[int,float()
  for d in


proc getPercent(self:Chara):float=
  let denom = 6.power(self.level)
  var mole = 0
  for k,v in dicesByLV[self.level]:
    let x = k.splitAsDecimal.toCounts()
    if self.check(x) : mole += v
  return 100 * mole.float / denom.float

proc `$`*(self:Chara):string =

  return fmt"LV{self.level} : {self.getPercent():.2f}% : {self.name}"


for charas in charasByLevel:
  let level = charas[0].level
  let allLevel = newChara(fmt"LV{level}のいずれか",level,x => charas.anyIt(it.check(x)))
  for chara in charas:
    echo chara
  echo allLevel
