import sequtils,strutils,sugar,math,strformat,tables,algorithm
import lib
import gahoudata



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

# ダイスを 1 つ振り直す
template rerollFunc(filter) : int -> seq[Table[int,float]] =
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
# ダイスを1つ任意に変える
template changeFunc(filter,nextImpl) : int -> seq[Table[int,float]] =
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
          if d == 0 or d > 6 : continue # 無視
          var dstArr = dices
          if d < 0 : dstArr.delete(i) #削除
          else: dstArr[i] = d
          result &= @[(dstArr.toKey(),1.0)].toTable()
    impl

# ダイスを2つ変化させる
template changeFunc2(filter,nextImpl) : int -> seq[Table[int,float]] =
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
            if d1 == 0 or d1 > 6 : continue # 無視
            var dstArr = dices
            if d1 < 0 : dstArr.delete(i) #削除
            else: dstArr[i] = d1
            for d2 in nexts2:
              if d2 < 0 : dstArr.delete(j) #削除
              else: dstArr[j] = d2
            result &= @[(dstArr.toKey(),1.0)].toTable()
            used[it1][it2] = true
    impl

# パターン -> 選択肢 -> 可能性
var skills : seq[int->seq[Table[int,float]]] = @[]
skills &= rerollFunc(true) # 振り直し(=アリス)
skills &= rerollFunc(it mod 2 == 0) #　橙
skills &= rerollFunc(it mod 2 == 1) # リグル
skills &= rerollFunc(it <= 4) # ルーミア
skills &= rerollFunc(it >= 3) # レティ
skills &= changeFunc(it == 1,@[1,2,3,4,5,6]) # てゐ
skills &= changeFunc(it == 6,@[1,2,3,4,5,6]) # にとり
skills &= changeFunc(true,@[-1]) # 慧音
skills &= changeFunc(true,@[it + 1]) # メルラン
skills &= changeFunc(true,@[it - 1]) # ルナサ
skills &= changeFunc(true,toSeq(1..6).filterIt(dices.toCounts[it] == 1)) # リリカ
skills &= changeFunc(it mod 2 == 1,@[2,4,6]) # イナバ
skills &= changeFunc(it mod 2 == 1,@[if it == 0 : -1 else:it div 2]) # 妖夢
skills &= changeFunc(true,@[7 - it]) # 霊夢
skills &= changeFunc(true,@[dices.max()]) # 咲夜
skills &= changeFunc(true,@[dices.min()]) # 魔理沙
skills &= changeFunc(true,toSeq(1..<it)) # レミリア
skills &= changeFunc(true,toSeq(it+1..6)) # 幽香
skills &= changeFunc(true,dices.deduplicate()) # 藍
skills &= changeFunc2(it1 >= 4 and it2 >= 4,(@[it1 - 1],@[it2 - 1])) # チルノ
skills &= changeFunc2(it1 <= 3 and it2 <= 3,(@[it1 + 1],@[it2 + 1])) # ミスティア
skills &= changeFunc2(it1 == 5 and it2 == 5,(toSeq(1..6),toSeq(1..6))) # 早苗



# TODO: さなえ / メイリン / パチェ /  衣玖
#     : えいりん / 幽々子 / シート4

proc skillToGraph(skill:int->seq[Table[int,float]]) : Table[int,seq[Table[int,float]]] =
  result = initTable[int,seq[Table[int,float]]]()
  for src,_ in allDicePattern:
    result[src] = @[]
    result[src] &= @[(src,1.0)].toTable() # この能力を使わなかった
    result[src] &= skill(src)

let skillGraphs = identityGraph & skills.mapIt(skillToGraph(it))
# let reroll2 = rerollGraph * rerollGraph
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
proc `$`*(self:Chara):string =
  result = fmt"LV{self.level} : "
  for graph in skillGraphs: # :.2f
    result &= fmt"{self.reduce(graph).int}% : "
  result &= self.name


for charas in charasByLevel:
  let level = charas[0].level
  let allLevel = newChara(fmt"LV{level}のいずれか",level,x => charas.anyIt(it.check(x)))
  var means = newSeq[float]()
  var alls = newSeq[float]()
  for graph in skillGraphs:
    means &= (charas).mapIt(it.reduce(graph).int).sum() / (charas.len)
    alls &= allLevel.reduce(graph)
  echo "LEVEL ",level
  echo means.mapIt(fmt"{it.int:2d}%").join(" ")
  echo alls.mapIt(fmt"{it.int:2d}%").join(" ")
    # for chara in charas & allLevel:
    #   echo chara
