import sequtils,strutils,sugar,math,intsets,tables,algorithm
import lib
type Chara* = ref object
  name*:string
  level*:int
  check*: seq[int] -> bool
  okPattern: IntSet
proc checkDice*(self:Chara,k:int):bool = k in self.okPattern # WARN sort

proc newChara*(name:string,level:int,check:seq[int]->bool) :Chara =
  new(result)
  result.name = name
  result.level = level
  result.check = check
  result.okPattern = initIntSet()
  for k,_ in allDicePattern:
    if not check(k.splitAsDecimal.toCounts()) : continue
    result.okPattern.incl k

proc weightedSum(X:seq[int]): int =
  for i,x in X: result += i * x

let charasByLevel* = @[
  @[ # 3
    newChara("チルノ", 3, x => x.weightedSum() == 9),
    newChara("ミスティア", 3, x => x.weightedSum() == 12),
    newChara("リグル", 3, x => x[4] == 0 and x[6] == 0),
    newChara("ルーミア", 3, x => x.weightedSum() >= 13),
    newChara("レティ", 3, x => x.weightedSum() <= 8),
    newChara("慧音", 3, x => x[1] == 0 and x[3] == 0 and x[5] == 0),
    newChara("橙", 3, x => x.anyIt(it >= 2)),
  ], @[  # 4
    newChara("アリス", 4, x => x.allIt(it < 2)),
    newChara("てゐ", 4, x => x.weightedSum() >= 17),
    newChara("にとり", 4, x => x.weightedSum() <= 11),
    newChara("メルラン", 4, x => x[1] == 0 and x[2] == 0),
    newChara("リリカ", 4, x => x[3] == 0 and x[4] == 0),
    newChara("ルナサ", 4, x => x[5] == 0 and x[6] == 0),
    newChara("美鈴", 4, x => (x[1] + x[3] + x[5] >= 4) or (x[2] + x[4] + x[6] >= 4)),
  ], @[ # 5
    newChara("イナバ", 5, x => x[2] == 0 and x[4] == 0 and x[6] == 0),
    newChara("パチュリー", 5, x => x.filterIt(it >= 1).len >= 5),
    newChara("咲夜", 5, x => x.weightedSum() <= 12),
    newChara("早苗", 5, x => x.max() >= 4),
    newChara("魔理沙", 5, x => x.weightedSum() >= 23),
    newChara("妖夢", 5, x => x[1] + x[2] + x[3] >= 5),
    newChara("霊夢", 5, x => x[1] == 0 and x[2] == 0 and x[3] == 0),
  ], @[ # 6
    newChara("レミリア", 6, x => x.weightedSum() <= 12),
    newChara("衣玖", 6, x => x.filterIt(it >= 1).len >= 6),
    newChara("永琳", 6, x => x.max() >= 5),
    newChara("幽香", 6, x => x.weightedSum() >= 30),
    newChara("幽々子", 6, x => x[2] + x[4] + x[6] >= 6),
    newChara("藍", 6, x => x.filterIt(it >= 1).len <= 2),
  ], @[ # 7
    newChara("フランドール", 7, x => x[1] + x[2] >= 7),
    newChara("輝夜", 7, x => x.max() >= 6),
    newChara("小町", 7, x => x.weightedSum() == 13),
    newChara("天子", 7, x => x[1] == 0 and x[2] == 0 and x[3] == 0 and x[4] == 0),
    newChara("妹紅", 7, x => x.weightedSum() >= 38),
  ], @[ # 8
    newChara("萃香", 8, x => x.max() >= 7),
    newChara("四季映姫", 8, x => x.weightedSum() <= 11),
    newChara("紫", 8, x => x[2] == 0 and x[3] == 0 and x[4] == 0 and x[5] == 0),
    newChara("神奈子", 8, x => x.weightedSum() >= 46),
  ]
]
