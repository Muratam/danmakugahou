import sequtils,strutils,sugar,math,strformat,tables,algorithm,intSets,hashes,sets
import lib
type Dest* = Table[int,float]
type Dests* = seq[Dest]
type Graph* = Table[int,Dests]
proc toHash(dest:Dest):Hash = hash(toSeq(dest.pairs).mapIt((it[0],(it[1] * 10000 + 0.5).int)))

# アリス(ダイスをリロール) 後に藍(任意変更) == 天子 なので `*` で,天子も`*`として実装できておきたいが,一般化してしまうとパターンが多すぎるので無理
# proc `*`*(A:Dests,B:Graph):Dests =
#   result = @[]
#   var patterns = newSeq[Dest]()
#   var useds = initSet[Hash]()
#   prettyprint A
#   for aDsts in A:
#     let destinations = toSeq(aDsts.pairs).mapIt((dests:B[it[0]],val:it[1]))
#     proc fill(i:int,p:Dest) =
#       let h = p.toHash()
#       if h in useds: return
#       useds.incl h
#       if i == destinations.len :
#         patterns &= p
#         return
#       let (dests,val) = destinations[i]
#       for dest in dests:
#         var next = p
#         for k,v in dest:
#           next[k] = next.getOrDefault(k,0.0) + val * v
#         fill(i+1,next)
#     fill(0,initTable[int,float]())
#   prettyprint patterns
#   result = patterns
#   echo result.len


# proc `*`*(A,B:Graph):Graph =
#   result = initTable[int,Dests]()
#   for aSrc in A.keys: result[aSrc] = A[aSrc] * B

let identityGraph* = (proc ():Graph =
  result = initTable[int,Dests]()
  for src,_ in allDicePattern: result[src] = @[@[(src,1.0)].toTable()]
)()

proc skillToGraph*(skill:int->Dests) : Graph =
  result = initTable[int,Dests]()
  for src,_ in allDicePattern:
    var dests = newSeq[Dest]()
    let nop = @[(src,1.0)].toTable() # この能力を使わなかった
    var useds = initSet[Hash]()
    useds.incl nop.toHash()
    result[src] = @[nop]
    for s in skill(src):
      let h = s.toHash()
      if h in useds: continue
      useds.incl h
      result[src] &= s

const deletedNumber* = -1000
proc toAllPattern*(fun:int->Dests) : Graph =
  result = initTable[int,Dests]()
  for src,_ in allDicePattern: result[src] = fun(src)
# ダイスを 1 つ振り直す
template rerollFunc*(filter) : int -> Dests =
  block:
    proc impl(src:int):Dests =
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
template changeFunc*(filter,nextImpl) : int -> Dests =
  block:
    proc impl(src:int):Dests =
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
template changeFunc2*(filter,nextImpl) : int -> Dests =
  block:
    proc impl(src:int):Dests =
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
template changeFunc1Or2*(filter,nextImpl1,nextImpl2) : int -> Dests =
  block:
    let impl1 = changeFunc(filter,nextImpl1)
    let impl2 = changeFunc2(filter,nextImpl2)
    proc impl(src:int):Dests = impl1(src) & impl2(src)
    impl
proc skillOfSuika*(src:int):Dests =
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
proc skillOfYukari*(src:int):Dests =
  # 1~6のいずれかを選んでプラスマイナス1のダイスをすべてそれに変化
  result = @[]
  let dices = src.splitAsDecimal()
  for i in 1..6:
    var nexts = dices.mapIt(if abs(it - i) <= 1 : i else:it )
    result &= @[(nexts.toKey(),1.0)].toTable()
proc skillOfPache*(src:int):Dests =
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
proc skillOfShiki*(src:int):Dests =
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
let rerollGraph = reroll.toAllPattern()
let anyChangeGraph = changeFunc(true,toSeq(1..6)).toAllPattern()
let anyChange2Graph = changeFunc2(true,(toSeq(1..6),toSeq(1..6))).toAllPattern()
# ダイスを1個振り直した後一つを任意に変更

proc skillOfTenshi*(src:int):Dests =
  result = @[]
  let dices = src.splitAsDecimal()
  for i in 0..<dices.len: # i番目を振り直して dに
    if i > 0 and dices[i] == dices[i-1] : continue
    for j in 0..<dices.len: # j 番目を任意に変更して d2 に
      if j > 0 and dices[j] == dices[j-1] and (dices[i] != dices[j] or (j > 1 and dices[j-2] == dices[j])): continue
      if i == j : # 同じ時は要は任意に変更するスキル
        var next = dices
        for d in 1..6:
          next[i] = d
          result &= @[(next.toKey(),1.0)].toTable()
        continue
      for d2 in 1..6:
        var nexts = initTable[int,float]()
        var next = dices
        next[j] = d2
        for d in 1..6:
          next[i] = d
          let key = next.toKey()
          nexts[key] = nexts.getOrDefault(key,0.0) + 1/6
        result &= nexts
proc addDices(dices:seq[int],addCount:int) : Table[int,float]=
  let denom = 6.power(addCount)
  result = initTable[int,float]()
  for k,v in dicePatternByLevel[addCount]:
    let nextKeys = (dices & k.splitAsDecimal()).toKey()
    result[nextKeys] = result.getOrDefault(nextKeys,0.0) + v / denom
proc skillOfMeirin*(src:int):Dests =
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
proc skillOfIku*(src:int):Dests =
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
proc skillOfKomachi*(src:int):Dests =
  # 任意-1+2
  result = @[]
  let dices = src.splitAsDecimal()
  for i in 0..<dices.len:
    if i > 0 and dices[i-1] == dices[i] : continue
    var nexts = dices
    nexts.delete(i)
    result &= nexts.addDices(2)
proc skillOfKanako*(src:int):Dests = discard
  # ランダム+2 のち 任意2
  # return @[src.splitAsDecimal().addDices(2)] * anyChange2Graph
