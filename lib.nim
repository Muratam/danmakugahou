import sequtils,algorithm,tables
const diceMaxCount* = 10 # 8 ~ 13
proc prettyPrint*[T](A:seq[T]) =
  for a in A: echo a

proc mean*[T](A:seq[T]):T = A.sum() / A.len().float

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
  result = newSeqWith(diceMaxCount+1,initTable[int,int]())
  for i in 1..6:result[1][i] = 1
  for i in 2..diceMaxCount:
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