import sequtils,strutils,sugar,math,strformat,tables,algorithm,intSets
import lib

proc `*`*(A:seq[Table[int,float]],B:Table[int,seq[Table[int,float]]]):seq[Table[int,float]] =
  result = @[]
  for aDsts in A:
    for mid,aVal in aDsts:
      if mid notin B : continue
      var nextsBase = aDsts
      nextsBase.del mid
      for bDsts in B[mid]:
        var nexts = nextsBase
        for dst,bVal in bDsts:
          nexts[dst] = nexts.getOrDefault(dst,0.0) + aVal * bVal
        result &= nexts

proc `*`*(A,B:Table[int,seq[Table[int,float]]]):Table[int,seq[Table[int,float]]] =
  result = initTable[int,seq[Table[int,float]]]()
  for aSrc in A.keys: result[aSrc] = A[aSrc] * B

let identityGraph* = (proc ():Table[int,seq[Table[int,float]]] =
  result = initTable[int,seq[Table[int,float]]]()
  for src,_ in allDicePattern: result[src] = @[@[(src,1.0)].toTable()]
)()

proc skillToGraph*(skill:int->seq[Table[int,float]]) : Table[int,seq[Table[int,float]]] =
  result = initTable[int,seq[Table[int,float]]]()
  for src,_ in allDicePattern:
    result[src] = @[]
    result[src] &= @[(src,1.0)].toTable() # この能力を使わなかった
    result[src] &= skill(src)

const deletedNumber* = -1000
proc toAllPattern*(fun:int->seq[Table[int,float]]) : Table[int,seq[Table[int,float]]] =
  result = initTable[int,seq[Table[int,float]]]()
  for src,_ in allDicePattern: result[src] = fun(src)
# ダイスを 1 つ振り直す
template rerollFunc*(filter) : int -> seq[Table[int,float]] =
  block:
    proc impl(src:int):seq[Table[int,float]] =
      result = @[]
      let dices = src.splitAsDecimal()
      for i in 0..<dices.len:
        if i > 0 and dices[i-1] == dices[i] : continue
        let it{.inject.} = dices[i]
        if not (filter): continue
        var dstArr = dices
        var nexts = initTable[int,float]()
        for d in 1..6:
          dstArr[i] = d
          let dst = dstArr.toKey()
          nexts[dst] = nexts.getOrDefault(dst,0.0) + (1.0 / 6.0)
        result &= nexts
    impl
proc change*(dices:seq[int],i,d:int) : seq[int] =
  if (d <= 0 and d != deletedNumber) or d > 6 : return @[]
  result = dices
  if d == deletedNumber : result.delete(i) #削除
  else: result[i] = d
# ダイスを1つ任意に変える
template changeFunc*(filter,nextImpl) : int -> seq[Table[int,float]] =
  block:
    proc impl(src:int):seq[Table[int,float]] =
      result = @[]
      let dices{.inject.} = src.splitAsDecimal()
      for i in 0..<dices.len:
        if i > 0 and dices[i-1] == dices[i] : continue
        let it{.inject.} = dices[i]
        if not (filter): continue
        let nexts = nextImpl
        for d in nexts:
          let dstArr = dices.change(i,d)
          if dstArr.len == 0 : continue
          result &= @[(dstArr.toKey(),1.0)].toTable()
    impl
# ダイスを2つ変化させる
template changeFunc2*(filter,nextImpl) : int -> seq[Table[int,float]] =
  block:
    proc impl(src:int):seq[Table[int,float]] =
      result = @[]
      let dices{.inject.} = src.splitAsDecimal()
      if dices.len < 2 : return
      var used = newSeqWith(7,newSeqWith(7,false))
      for i in 0..<dices.len:
        for j in 0..<dices.len:
          if i == j : continue
          let it1{.inject.} = dices[i]
          let it2{.inject.} = dices[j]
          if not (filter): continue
          if used[it1][it2] : continue
          let (nexts1,nexts2) = nextImpl
          for d1 in nexts1:
            var dstArr = dices.change(i,d1)
            if dstArr.len == 0 : continue # 無視
            for d2 in nexts2:
              var dstArr2 = dstArr.change(j,d2)
              if dstArr2.len == 0 : continue
              result &= @[(dstArr2.toKey(),1.0)].toTable()
            used[it1][it2] = true
    impl
# ダイス1つを .. もしくは ダイス2つを...
template changeFunc1Or2*(filter,nextImpl1,nextImpl2) : int -> seq[Table[int,float]] =
  block:
    let impl1 = changeFunc(filter,nextImpl1)
    let impl2 = changeFunc2(filter,nextImpl2)
    proc impl(src:int):seq[Table[int,float]] = impl1(src) & impl2(src)
    impl
proc skillOfSuika*(src:int):seq[Table[int,float]] =
  # ある目すべてを最も個数の多いものに変化させる
  result = @[]
  let dices = src.splitAsDecimal()
  let counts = dices.toCounts()
  let changeAbles = toSeq(1..6).filterIt(counts[it] == counts.max())
  for i in 1..6:
    if i notin dices : continue
    for j in changeAbles: # i->j
      if i == j : continue
      var nexts = dices.mapIt(if it == i : j else: it)
      result &= @[(nexts.toKey(),1.0)].toTable()
proc skillOfYukari*(src:int):seq[Table[int,float]] =
  # 1~6のいずれかを選んでプラスマイナス1のダイスをすべてそれに変化
  result = @[]
  let dices = src.splitAsDecimal()
  for i in 1..6:
    var nexts = dices.mapIt(if abs(it - i) <= 1 : i else:it )
    result &= @[(nexts.toKey(),1.0)].toTable()
proc skillOfPache*(src:int):seq[Table[int,float]] =
  result = @[]
  let dices = src.splitAsDecimal()
  for i in [0,1]:
    var nexts = initTable[int,float]()
    let targets = dices.filterIt(it mod 2 == i)
    let nonTargets = dices.filterIt(it mod 2 != i)
    if targets.len == 0 : continue
    let targetPatterns = dicePatternByLevel[targets.len]
    let denom = 6.power(targets.len)
    for k,v in targetPatterns:
      let nextKey = (k.splitAsDecimal() & nonTargets).toKey()
      nexts[nextKey] = nexts.getOrDefault(nextKey,0.0) + v / denom
    result &= nexts
proc skillOfShiki*(src:int):seq[Table[int,float]] =
  proc find(arr: seq[int],item: int): int {.inline.}=
    for i in 0..<arr.len:
      if arr[i] == item : return i
    return -1
  let dices = src.splitAsDecimal()
  let counts = dices.toCounts()
  if toSeq(1..6).anyIt(counts[it] == 0) : return @[]
  var patterns = initIntSet()
  for i in 1..6:
    for j in (i+1)..6:
      for k in (j+1)..6:
        for l in (k+1)..6:
          # ４箇所を選んだ
          let ip = dices.find(i)
          let jp = dices.find(j)
          let kp = dices.find(k)
          let lp = dices.find(l)
          for i1 in 1..6:
            for j1 in 1..6:
              for k1 in 1..6:
                for l1 in 1..6:
                  var nexts = dices
                  nexts[ip] = i1
                  nexts[jp] = j1
                  nexts[kp] = k1
                  nexts[lp] = l1
                  patterns.incl nexts.toKey
  result = @[]
  for p in patterns.items:
    result &= @[(p,1.0)].toTable()
let reroll = rerollFunc(true)
let anyChange = changeFunc(true,toSeq(1..6)).toAllPattern()
let anyChange2 = changeFunc2(true,(toSeq(1..6),toSeq(1..6))).toAllPattern()
proc skillOfTenshi*(src:int):seq[Table[int,float]] =
  # ダイスを1個振り直した後一つを任意に変更
  reroll(src) * anyChange
proc addDices(dices:seq[int],addCount:int) : Table[int,float]=
  let denom = 6.power(addCount)
  result = initTable[int,float]()
  for k,v in dicePatternByLevel[addCount]:
    let nextKeys = (dices & k.splitAsDecimal()).toKey()
    result[nextKeys] = result.getOrDefault(nextKeys,0.0) + v / denom
proc skillOfMeirin*(src:int):seq[Table[int,float]] =
  # 偶数-3+4
  result = @[]
  let dices = src.splitAsDecimal()
  let targets = toSeq(0..<dices.len).filterIt(dices[it] mod 2 == 0)
  if targets.len < 3 : return
  var usedPatterns = initIntSet()
  for i in 0..<dices.len:
    if i notin targets : continue
    for j in (i+1)..<dices.len:
      if j notin targets : continue
      for k in (j+1)..<dices.len:
        if k notin targets: continue
        let key = @[dices[i],dices[j],dices[k]].toKey()
        if key in usedPatterns : continue
        usedPatterns.incl key
        var nexts = dices
        nexts.delete(k)
        nexts.delete(j)
        nexts.delete(i)
        result &= nexts.addDices(4)
proc skillOfIku*(src:int):seq[Table[int,float]] =
  # 同じ出目-2+3
  result = @[]
  let dices = src.splitAsDecimal()
  let counts = dices.toCounts()
  let targets = toSeq(1..6).filterIt(counts[it] >= 2)
  for t in targets:
    var nexts = dices
    for i in 0..<nexts.len:
      if nexts[i] == t : nexts.delete(i)
    for i in 0..<nexts.len:
      if nexts[i] == t : nexts.delete(i)
    result &= nexts.addDices(3)
proc skillOfKomachi*(src:int):seq[Table[int,float]] =
  # 任意-1+2
  result = @[]
  let dices = src.splitAsDecimal()
  for i in 0..<dices.len:
    if i > 0 and dices[i-1] == dices[i] : continue
    var nexts = dices
    nexts.delete(i)
    result &= nexts.addDices(2)
proc skillOfKanako*(src:int):seq[Table[int,float]] =
  # ランダム+2 のち 任意2
  return @[src.splitAsDecimal().addDices(2)] * anyChange2
