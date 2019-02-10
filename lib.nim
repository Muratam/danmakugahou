import sequtils,algorithm

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

proc toKey*(A:seq[int]):int =(for a in A.sorted(cmp): result = result * 10 + a)
proc toCounts*(dices:seq[int]):seq[int] =
  result = newSeq[int](7)
  for d in dices: result[d] += 1

# ダイスは 8 個からは増えないと仮定すると {},{1},{2},...,{66666666}　まで 3003通りになる
# proc decompress(k:int):int =
#   const lens = [0,6,21,56,126,252,462,792,1287,2002,3003,4368,6188]
#   const sums = [0,6,27,83,209,461,923,1715,3002 ,5004,8007,12375,18563]
#   # 11 12 13 14 15 16 22 23 24 25 26 33 34 35 36 44 45 46
#   #  7  8  9 10 11 12 13 14 15 16 17
#   if k < 10 : return k
#   if k < 100 : return k
