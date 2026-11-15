
import os
let names = commandLineParams()
let target = allCharas.filterIt(it.name == names[0])[0]
var charas = newSeq[Chara]()
for n in names[1..^1]: charas &= allCharas.filterIt(it.name == n)[0]
stopwatch:
  let (b,e) = target.reduceGraphs(charas)
  echo names, " ", e
