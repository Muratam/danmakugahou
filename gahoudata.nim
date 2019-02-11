import sequtils,strutils,sugar,math,intsets,tables,algorithm
import lib
import skill
type Chara* = ref object
  name*:string
  level*:int
  check*: seq[int] -> bool
  okPattern: IntSet
  skill*:int->seq[Table[int,float]]
  skillGraph*:Table[int,seq[Table[int,float]]]
proc checkDice*(self:Chara,k:int):bool = k in self.okPattern # WARN

proc newChara*(name:string,level:int,check:seq[int]->bool,skill:int->seq[Table[int,float]]) :Chara =
  new(result)
  result.name = name
  result.level = level
  result.check = check
  result.skill = skill
  result.skillGraph = skill.skillToGraph()
  result.okPattern = initIntSet()
  for k,_ in allDicePattern:
    if not check(k.splitAsDecimal.toCounts()) : continue
    result.okPattern.incl k

proc weightedSum(X:seq[int]): int =
  for i,x in X: result += i * x

# パターン -> 選択肢 -> 可能性
# 振り直し(=アリス)
# # 以下はダイスが増えて計算時間が増えるので保留
# skills &= skillOfMeirin # 美鈴
# skills &= skillOfIku # 衣玖
# skills &= skillOfTenshi # 天子
# skills &= skillOfKanako # 神奈子
let notImplementedSkill = rerollFunc(false)
let charasByLevel* = @[
  @[ # 2: System
    newChara("No Skill",2,x=>true,rerollFunc(false)),
    newChara("Reroll",2,x=>true,rerollFunc(true)),
  ],@[ # 3
    newChara("チルノ", 3, x => x.weightedSum() == 9,changeFunc2(it1 >= 4 and it2 >= 4,(@[it1 - 1],@[it2 - 1]))),
    newChara("ミスティア", 3, x => x.weightedSum() == 12,changeFunc2(it1 <= 3 and it2 <= 3,(@[it1 + 1],@[it2 + 1]))),
    newChara("リグル", 3, x => x[4] == 0 and x[6] == 0,rerollFunc(it mod 2 == 1)),
    newChara("ルーミア", 3, x => x.weightedSum() >= 13,rerollFunc(it <= 4)),
    newChara("レティ", 3, x => x.weightedSum() <= 8,rerollFunc(it >= 3)),
    newChara("慧音", 3, x => x[1] == 0 and x[3] == 0 and x[5] == 0,changeFunc(true,@[deletedNumber])),
    newChara("橙", 3, x => x.anyIt(it >= 2),rerollFunc(it mod 2 == 0)),
  ], @[  # 4
    newChara("アリス", 4, x => x.allIt(it < 2),rerollFunc(true)),
    newChara("てゐ", 4, x => x.weightedSum() >= 17,changeFunc(it == 1,@[1,2,3,4,5,6])),
    newChara("にとり", 4, x => x.weightedSum() <= 11,changeFunc(it == 6,@[1,2,3,4,5,6])),
    newChara("メルラン", 4, x => x[1] == 0 and x[2] == 0,changeFunc(true,@[it + 1])),
    newChara("リリカ", 4, x => x[3] == 0 and x[4] == 0,changeFunc(true,toSeq(1..6).filterIt(dices.toCounts[it] == 1))),
    newChara("ルナサ", 4, x => x[5] == 0 and x[6] == 0,changeFunc(true,@[it - 1])),
    newChara("美鈴", 4, x => (x[1] + x[3] + x[5] >= 4) or (x[2] + x[4] + x[6] >= 4),skillOfMeirin),
  ], @[ # 5
    newChara("イナバ", 5, x => x[2] == 0 and x[4] == 0 and x[6] == 0,changeFunc(it mod 2 == 1,@[2,4,6])),
    newChara("パチュリー", 5, x => x.filterIt(it >= 1).len >= 5,skillOfPache),
    newChara("咲夜", 5, x => x.weightedSum() <= 12,changeFunc(true,@[dices.max()])),
    newChara("早苗", 5, x => x.max() >= 4,changeFunc2(it1 == 5 and it2 == 5,(toSeq(1..6),toSeq(1..6)))),
    newChara("魔理沙", 5, x => x.weightedSum() >= 23,changeFunc(true,@[dices.min()])),
    newChara("妖夢", 5, x => x[1] + x[2] + x[3] >= 5,changeFunc(it mod 2 == 1,@[if it == 1 : deletedNumber else:it div 2])),
    newChara("霊夢", 5, x => x[1] == 0 and x[2] == 0 and x[3] == 0,changeFunc(true,@[7 - it])),
  ], @[ # 6
    newChara("レミリア", 6, x => x.weightedSum() <= 12,changeFunc(true,toSeq(1..<it))),
    newChara("衣玖", 6, x => x.filterIt(it >= 1).len >= 6,notImplementedSkill),
    newChara("永琳", 6, x => x.max() >= 5,changeFunc2(true,(@[it1 + 1],@[it2 - 1]))),
    newChara("幽香", 6, x => x.weightedSum() >= 30,changeFunc(true,toSeq(it+1..6))),
    newChara("幽々子", 6, x => x[2] + x[4] + x[6] >= 6,changeFunc2(true,(@[4],@[4]))),
    newChara("藍", 6, x => x.filterIt(it >= 1).len <= 2,changeFunc(true,dices.deduplicate())),
  ], @[ # 7
    newChara("フランドール", 7, x => x[1] + x[2] >= 7,changeFunc1Or2(true,@[1.max(it - 2)],(@[it1 - 1],@[it2 - 1]))),
    newChara("輝夜", 7, x => x.max() >= 6,changeFunc2(true,(@[1],@[6]))),
    newChara("小町", 7, x => x.weightedSum() == 13,notImplementedSkill),
    newChara("天子", 7, x => x[1] == 0 and x[2] == 0 and x[3] == 0 and x[4] == 0,notImplementedSkill),
    newChara("妹紅", 7, x => x.weightedSum() >= 38,changeFunc1Or2(true,@[6.max(it + 2)],(@[it1 + 1],@[it2 + 1]))),
  ], @[ # 8
    newChara("萃香", 8, x => x.max() >= 7,skillOfSuika),
    newChara("四季映姫", 8, x => x.weightedSum() <= 11,skillOfShiki),
    newChara("紫", 8, x => x[2] == 0 and x[3] == 0 and x[4] == 0 and x[5] == 0,skillOfYukari),
    newChara("神奈子", 8, x => x.weightedSum() >= 46,notImplementedSkill),
  ]
]

var allCharas* : seq[Chara] = @[]
for charas in charasByLevel: allCharas &= charas