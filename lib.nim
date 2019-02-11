import sequtils,algorithm,tables

proc power*(x,n:int): int =
  if n <= 1: return if n == 1: x else: 1
  let pow_2 = power(x,n div 2)
  return pow_2 * pow_2 * (if n mod 2 == 1: x else: 1)

proc splitAsDecimal*(n:int) : seq[int] =
  if n == 0 : return @[0]
  result = @[]
  var n = n
  while n > 0:
    result &= n mod 10
    n = n div 10
  return result.reversed()
proc toKeyUnsorted*(A:seq[int]):int =(for a in A: result = result * 10 + a)
proc toKey*(A:seq[int]):int =(for a in A.sorted(cmp): result = result * 10 + a)
proc toCounts*(dices:seq[int]):seq[int] =
  result = newSeq[int](7)
  for d in dices: result[d] += 1

# 最大で 1287 パターンしかない
let dicePatternByLevel* = (proc (): seq[Table[int,int]] =
  const maxCount = 8 # 8 ~ 13
  result = newSeqWith(maxCount+1,initTable[int,int]())
  for i in 1..6:result[1][i] = 1
  for i in 2..maxCount:
    for k,v in result[i-1].pairs:
      let ks = k.splitAsDecimal()
      for k2 in 1..6:
        let nextKey = (ks & k2).toKey()
        result[i][nextKey] = result[i].getOrDefault(nextKey,0) + v
)()
let allDicePattern* = (proc():Table[int,int] =
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

# proc `*`(A:Table[int,float],B:Table[int,Table[int,float]]):Table[int,float] =
#   result = initTable[int,float]()
#   for mid,valA in A:
#     if mid notin B : continue
#     for dst,valB in B[mid]:
#       result[dst] = result.getOrDefault(dst,0.0) + (valA * valB)

# proc `*`(A,B:Table[int,Table[int,float]]):Table[int,Table[int,float]] =
#   result = initTable[int,Table[int,float]]()
#   for aSrc,aDsts in A: result[aSrc] = result[aSrc] * B
