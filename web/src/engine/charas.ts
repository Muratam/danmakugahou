// 被写体（キャラ）36 人の撮影条件と使用能力。
// 能力の選択肢は「除く目の列 removes・決めて足す目の列 adds・その後の手順 kind（table.ts の演算の列）」で表す。
// 値 = kind の表（子の層）を、今の多重集合 − removes + adds の番号で引いたもの。
//
// ルール（Rules）:
//   card    … カードの文面どおり（既定。解釈は rulesNotes）
//   nim     … 元の Nim（main.nim・skill.nim・gahoudata.nim の今の版）と同じ。照合用
//   nim2019 … per.txt を出した 2019-02-11 の版（8333c2c）と同じ。照合用
//             （咲夜と魔理沙の能力が逆、美鈴・衣玖・小町・天子・神奈子は能力なし、目が 0 になったダイスは消える）

export type Rules = "card" | "nim" | "nim2019";

/** 個数（添字 1〜6 が目 1〜6。添字 0 は使わない） */
export type Counts = readonly number[];

export type Emit = (kind: string, removes: number[], adds: number[]) => void;

export interface Chara {
  id: string;
  /** 短い表示名 */
  name: string;
  /** カードの名前 */
  fullName: string;
  level: number;
  /** アイコンの色（画像が無いときの丸） */
  color: string;
  condText: string;
  skillText: string;
  cond(c: Counts, rules: Rules): boolean;
  /** 能力の選択肢を全部出す（使わない選択は含めない） */
  gen(c: Counts, emit: Emit, rules: Rules): void;
  /** 能力 1 回でダイスの個数が変わる幅 [最小, 最大]（使ったとき） */
  delta(rules: Rules): [number, number];
  /** 選択肢の説明（無ければ describe の既定） */
  label?(kind: string, removes: number[], adds: number[], rules: Rules): string | undefined;
}

const sum = (c: Counts) => c[1] + 2 * c[2] + 3 * c[3] + 4 * c[4] + 5 * c[5] + 6 * c[6];
const kinds = (c: Counts) => (c[1] > 0 ? 1 : 0) + (c[2] > 0 ? 1 : 0) + (c[3] > 0 ? 1 : 0) + (c[4] > 0 ? 1 : 0) + (c[5] > 0 ? 1 : 0) + (c[6] > 0 ? 1 : 0);
const maxc = (c: Counts) => Math.max(c[1], c[2], c[3], c[4], c[5], c[6]);
const none = (c: Counts, vs: number[]) => vs.every((v) => c[v] === 0);
const total = (c: Counts) => c[1] + c[2] + c[3] + c[4] + c[5] + c[6];
const R = (k: number) => "R".repeat(k);
const VALUES = [1, 2, 3, 4, 5, 6];

/** ダイス 1 個（目 a）を選ぶ */
function each1(c: Counts, f: (a: number) => void) {
  for (const a of VALUES) if (c[a] > 0) f(a);
}
/** 別々のダイス 2 個（目 a, b。順序あり）を選ぶ */
function each2(c: Counts, f: (a: number, b: number) => void) {
  for (const a of VALUES)
    for (const b of VALUES) {
      if (a === b ? c[a] < 2 : c[a] < 1 || c[b] < 1) continue;
      f(a, b);
    }
}
/** 目 a のダイス 1 個を、ルールの下で目 b にする（b が範囲外なら null、2019 版で 0 なら消える） */
function changeTo(rules: Rules, a: number, b: number): { rm: number[]; ad: number[] } | null {
  if (b >= 1 && b <= 6) return { rm: [a], ad: [b] };
  if (rules === "nim2019" && b === 0) return { rm: [a], ad: [] };
  return null;
}
/** 1 個の変化を emit する */
function emitChange(emit: Emit, rules: Rules, a: number, b: number) {
  const x = changeTo(rules, a, b);
  if (x) emit("", x.rm, x.ad);
}
/** 2 個の変化（a→a2, b→b2）を emit する */
function emitChange2(emit: Emit, rules: Rules, a: number, a2: number, b: number, b2: number) {
  const x = changeTo(rules, a, a2);
  const y = changeTo(rules, b, b2);
  if (x && y) emit("", [...x.rm, ...y.rm], [...x.ad, ...y.ad]);
}
/** 条件に合うダイス 1 個を振り直す */
function reroll1(c: Counts, emit: Emit, ok: (v: number) => boolean) {
  each1(c, (a) => {
    if (ok(a)) emit("R", [a], []);
  });
}

const join = (xs: number[]) => xs.join("・");

/** 選択肢の説明の既定 */
export function describe(kind: string, removes: number[], adds: number[]): string {
  if (kind === "") {
    if (removes.length && adds.length) return `${join(removes)} を ${join(adds)} に`;
    if (removes.length) return `${join(removes)} を除外`;
    if (adds.length) return `${join(adds)} を追加`;
    return "そのまま";
  }
  if (/^R+$/.test(kind) && adds.length === 0) {
    if (removes.length === kind.length) return `${join(removes)} を振り直す`;
    if (removes.length === 0) return `${kind.length} 個振って追加`;
    return `${join(removes)} を除外して ${kind.length} 個振る`;
  }
  const parts: string[] = [];
  if (removes.length) parts.push(`${join(removes)} を除外`);
  if (adds.length) parts.push(`${join(adds)} を追加`);
  parts.push(kind);
  return parts.join("、");
}

export const CHARAS: Chara[] = [
  // ---- レベル 3 ----
  {
    id: "cirno", name: "チルノ", fullName: "チルノ", level: 3, color: "#6ec6f0",
    condText: "出目の合計が 9", skillText: "出目が 4〜6 のダイス 2 個の出目に -1 する。",
    cond: (c) => sum(c) === 9,
    gen: (c, emit, rules) => each2(c, (a, b) => { if (a >= 4 && b >= 4 && a <= b) emitChange2(emit, rules, a, a - 1, b, b - 1); }),
    delta: () => [0, 0],
  },
  {
    id: "mystia", name: "ミスティア", fullName: "ミスティア・ローレライ", level: 3, color: "#b5546a",
    condText: "出目の合計が 12", skillText: "出目が 1〜3 のダイス 2 個の出目に +1 する。",
    cond: (c) => sum(c) === 12,
    gen: (c, emit, rules) => each2(c, (a, b) => { if (a <= 3 && b <= 3 && a <= b) emitChange2(emit, rules, a, a + 1, b, b + 1); }),
    delta: () => [0, 0],
  },
  {
    id: "wriggle", name: "リグル", fullName: "リグル・ナイトバグ", level: 3, color: "#3f8f5a",
    condText: "6 も 4 も出ていない", skillText: "出目が奇数のダイス 1 個を振りなおす。",
    cond: (c) => none(c, [4, 6]),
    gen: (c, emit) => reroll1(c, emit, (v) => v % 2 === 1),
    delta: () => [0, 0],
  },
  {
    id: "rumia", name: "ルーミア", fullName: "ルーミア", level: 3, color: "#e2c84a",
    condText: "出目の合計が 13 以上", skillText: "出目が 1〜4 のダイス 1 個を振りなおす。",
    cond: (c) => sum(c) >= 13,
    gen: (c, emit) => reroll1(c, emit, (v) => v <= 4),
    delta: () => [0, 0],
  },
  {
    id: "letty", name: "レティ", fullName: "レティ・ホワイトロック", level: 3, color: "#a9a4d8",
    condText: "出目の合計が 8 以下", skillText: "出目が 3〜6 のダイス 1 個を振りなおす。",
    cond: (c) => sum(c) <= 8,
    gen: (c, emit) => reroll1(c, emit, (v) => v >= 3),
    delta: () => [0, 0],
  },
  {
    id: "keine", name: "慧音", fullName: "上白沢 慧音", level: 3, color: "#5b7fc4",
    condText: "出目が全て偶数", skillText: "ダイス 1 個を除外する。",
    cond: (c) => none(c, [1, 3, 5]),
    gen: (c, emit) => each1(c, (a) => emit("", [a], [])),
    delta: () => [-1, -1],
  },
  {
    id: "chen", name: "橙", fullName: "橙", level: 3, color: "#d9603b",
    condText: "同じ出目が 2 個以上", skillText: "出目が偶数のダイス 1 個を振りなおす。",
    cond: (c) => maxc(c) >= 2,
    gen: (c, emit) => reroll1(c, emit, (v) => v % 2 === 0),
    delta: () => [0, 0],
  },
  // ---- レベル 4 ----
  {
    id: "alice", name: "アリス", fullName: "アリス・マーガトロイド", level: 4, color: "#e0b85a",
    condText: "出目が全て異なる", skillText: "ダイス 1 個を振りなおす。",
    cond: (c) => maxc(c) < 2,
    gen: (c, emit) => reroll1(c, emit, () => true),
    delta: () => [0, 0],
  },
  {
    id: "tewi", name: "てゐ", fullName: "因幡 てゐ", level: 4, color: "#e48fb0",
    condText: "出目の合計が 17 以上", skillText: "出目が 1 のダイス 1 個の出目を任意の値に変える。",
    cond: (c) => sum(c) >= 17,
    gen: (c, emit, rules) => { if (c[1] > 0) for (const b of VALUES) if (b !== 1) emitChange(emit, rules, 1, b); },
    delta: () => [0, 0],
  },
  {
    id: "nitori", name: "にとり", fullName: "河城 にとり", level: 4, color: "#3e9fc9",
    condText: "出目の合計が 11 以下", skillText: "出目が 6 のダイス 1 個の出目を任意の値に変える。",
    cond: (c) => sum(c) <= 11,
    gen: (c, emit, rules) => { if (c[6] > 0) for (const b of VALUES) if (b !== 6) emitChange(emit, rules, 6, b); },
    delta: () => [0, 0],
  },
  {
    id: "merlin", name: "メルラン", fullName: "メルラン・プリズムリバー", level: 4, color: "#b7a3e0",
    condText: "1 も 2 も出ていない", skillText: "ダイス 1 個の出目に +1 する。",
    cond: (c) => none(c, [1, 2]),
    gen: (c, emit, rules) => each1(c, (a) => emitChange(emit, rules, a, a + 1)),
    delta: () => [0, 0],
  },
  {
    id: "lyrica", name: "リリカ", fullName: "リリカ・プリズムリバー", level: 4, color: "#d4504f",
    condText: "3 も 4 も出ていない", skillText: "ダイス 1 個の出目を、今場に出ている数が 1 個の任意の出目と同じ値に変える。",
    cond: (c) => none(c, [3, 4]),
    gen: (c, emit, rules) => each1(c, (a) => { for (const b of VALUES) if (b !== a && c[b] === 1) emitChange(emit, rules, a, b); }),
    delta: () => [0, 0],
  },
  {
    id: "lunasa", name: "ルナサ", fullName: "ルナサ・プリズムリバー", level: 4, color: "#c9b04a",
    condText: "5 も 6 も出ていない", skillText: "ダイス 1 個の出目に -1 する。",
    cond: (c) => none(c, [5, 6]),
    gen: (c, emit, rules) => each1(c, (a) => emitChange(emit, rules, a, a - 1)),
    delta: (rules) => (rules === "nim2019" ? [-1, 0] : [0, 0]),
  },
  {
    id: "meiling", name: "美鈴", fullName: "紅 美鈴", level: 4, color: "#4fae6a",
    condText: "偶数の出目が 4 個以上、もしくは奇数の出目が 4 個以上", skillText: "出目が偶数のダイス 3 個を除外し、ダイスを 4 個振って追加する。",
    cond: (c) => c[1] + c[3] + c[5] >= 4 || c[2] + c[4] + c[6] >= 4,
    gen: (c, emit, rules) => {
      if (rules === "nim2019") return;
      // 偶数 3 個の組（多重集合）
      for (let a = 2; a <= 6; a += 2)
        for (let b = a; b <= 6; b += 2)
          for (let d = b; d <= 6; d += 2) {
            const need = [0, 0, 0, 0, 0, 0, 0];
            need[a]++;
            need[b]++;
            need[d]++;
            if (need[2] > c[2] || need[4] > c[4] || need[6] > c[6]) continue;
            emit(R(4), [a, b, d], []);
          }
    },
    delta: (rules) => (rules === "nim2019" ? [0, 0] : [1, 1]),
  },
  // ---- レベル 5 ----
  {
    id: "reisen", name: "鈴仙", fullName: "鈴仙・U・イナバ", level: 5, color: "#9d8fd6",
    condText: "出目が全て奇数", skillText: "出目が奇数のダイス 1 個の出目を、任意の偶数の値に変える。",
    cond: (c) => none(c, [2, 4, 6]),
    gen: (c, emit, rules) => each1(c, (a) => { if (a % 2 === 1) for (const b of [2, 4, 6]) emitChange(emit, rules, a, b); }),
    delta: () => [0, 0],
  },
  {
    id: "patchouli", name: "パチュリー", fullName: "パチュリー・ノーレッジ", level: 5, color: "#9b6fc0",
    condText: "出目が 5 種類以上", skillText: "偶数か奇数かを選び、それに当てはまる出目のダイス全てを振りなおす。",
    cond: (c) => kinds(c) >= 5,
    gen: (c, emit) => {
      for (const par of [1, 0]) {
        const rm: number[] = [];
        for (const v of VALUES) if (v % 2 === par) for (let x = 0; x < c[v]; x++) rm.push(v);
        if (rm.length) emit(R(rm.length), rm, []);
      }
    },
    delta: () => [0, 0],
    label: (_k, rm) => `${rm[0] % 2 === 1 ? "奇数" : "偶数"}（${join(rm)}）を全て振り直す`,
  },
  {
    id: "sakuya", name: "咲夜", fullName: "十六夜 咲夜", level: 5, color: "#8fa3b8",
    condText: "出目の合計が 12 以下", skillText: "ダイス 1 個の出目を、今場に出ている最小の出目と同じ値に変える。",
    cond: (c) => sum(c) <= 12,
    gen: (c, emit, rules) => {
      const lo = VALUES.find((v) => c[v] > 0);
      const hi = [...VALUES].reverse().find((v) => c[v] > 0);
      const to = rules === "nim2019" ? hi : lo;
      if (to !== undefined) each1(c, (a) => { if (a !== to) emitChange(emit, rules, a, to); });
    },
    delta: () => [0, 0],
  },
  {
    id: "sanae", name: "早苗", fullName: "東風谷 早苗", level: 5, color: "#4fb3a0",
    condText: "同じ出目が 4 個以上", skillText: "出目が 5 のダイス 2 個の出目を、それぞれ任意の値に変える。",
    cond: (c) => maxc(c) >= 4,
    gen: (c, emit) => { if (c[5] >= 2) emit("AA", [5, 5], []); },
    delta: () => [0, 0],
    label: () => "5・5 をそれぞれ好きな目に",
  },
  {
    id: "marisa", name: "魔理沙", fullName: "霧雨 魔理沙", level: 5, color: "#d8b53e",
    condText: "出目の合計が 23 以上", skillText: "ダイス 1 個の出目を、今場に出ている最大の出目と同じ値に変える。",
    cond: (c) => sum(c) >= 23,
    gen: (c, emit, rules) => {
      const lo = VALUES.find((v) => c[v] > 0);
      const hi = [...VALUES].reverse().find((v) => c[v] > 0);
      const to = rules === "nim2019" ? lo : hi;
      if (to !== undefined) each1(c, (a) => { if (a !== to) emitChange(emit, rules, a, to); });
    },
    delta: () => [0, 0],
  },
  {
    id: "youmu", name: "妖夢", fullName: "魂魄 妖夢", level: 5, color: "#7fbf8e",
    condText: "1〜3 の出目が 5 個以上", skillText: "ダイス 1 個の出目を半分の値（切捨て）に変える。出目が 0 になったダイスは除外する。",
    cond: (c) => c[1] + c[2] + c[3] >= 5,
    gen: (c, emit, rules) => each1(c, (a) => {
      // カード: どの目でも。Nim・2019: 奇数の目だけ（skill.nim の filter it mod 2 == 1）
      if (rules !== "card" && a % 2 === 0) return;
      const b = Math.floor(a / 2);
      if (b === 0) emit("", [a], []);
      else emit("", [a], [b]);
    }),
    delta: () => [-1, 0],
  },
  {
    id: "reimu", name: "霊夢", fullName: "博麗 霊夢", level: 5, color: "#d8414a",
    condText: "1〜3 が出ていない", skillText: "ダイス 1 個の出目を「7 − その出目」の値に変える。",
    cond: (c) => none(c, [1, 2, 3]),
    gen: (c, emit, rules) => each1(c, (a) => emitChange(emit, rules, a, 7 - a)),
    delta: () => [0, 0],
  },
  // ---- レベル 6 ----
  {
    id: "remilia", name: "レミリア", fullName: "レミリア・スカーレット", level: 6, color: "#b8344f",
    condText: "出目の合計が 12 以下", skillText: "ダイス 1 個の出目を、元の値より小さい任意の値に変える。",
    cond: (c) => sum(c) <= 12,
    gen: (c, emit, rules) => each1(c, (a) => { for (let b = 1; b < a; b++) emitChange(emit, rules, a, b); }),
    delta: () => [0, 0],
  },
  {
    id: "iku", name: "衣玖", fullName: "永江 衣玖", level: 6, color: "#4d63a8",
    condText: "出目が 6 種類", skillText: "同じ出目のダイス 2 個を除外し、ダイスを 3 個振って追加する。",
    cond: (c) => kinds(c) >= 6,
    gen: (c, emit, rules) => {
      if (rules === "nim2019") return;
      for (const v of VALUES) if (c[v] >= 2) emit(R(3), [v, v], []);
    },
    delta: (rules) => (rules === "nim2019" ? [0, 0] : [1, 1]),
  },
  {
    id: "eirin", name: "永琳", fullName: "八意 永琳", level: 6, color: "#5a5fa8",
    condText: "同じ出目が 5 個以上", skillText: "ダイス 1 個の出目に -1 し、別のダイス 1 個の出目に +1 する。",
    cond: (c) => maxc(c) >= 5,
    gen: (c, emit, rules) => each2(c, (a, b) => emitChange2(emit, rules, a, a - 1, b, b + 1)),
    delta: (rules) => (rules === "nim2019" ? [-1, 0] : [0, 0]),
    label: (_k, rm, ad, rules) => (ad.length === 2 ? `${rm[0]} を ${ad[0]} に、${rm[1]} を ${ad[1]} に` : rules === "nim2019" ? `1 を 0 に（消える）、${rm[1]} を ${ad[0]} に` : undefined),
  },
  {
    id: "yuka", name: "幽香", fullName: "風見 幽香", level: 6, color: "#5fa65a",
    condText: "出目の合計が 30 以上", skillText: "ダイス 1 個の出目を、元の値より大きい任意の値に変える。",
    cond: (c) => sum(c) >= 30,
    gen: (c, emit, rules) => each1(c, (a) => { for (let b = a + 1; b <= 6; b++) emitChange(emit, rules, a, b); }),
    delta: () => [0, 0],
  },
  {
    id: "yuyuko", name: "幽々子", fullName: "西行寺 幽々子", level: 6, color: "#e59ac0",
    condText: "偶数の出目が 6 個以上", skillText: "ダイス 2 個の出目を 4 に変える。",
    cond: (c) => c[2] + c[4] + c[6] >= 6,
    gen: (c, emit, rules) => each2(c, (a, b) => { if (a <= b) emitChange2(emit, rules, a, 4, b, 4); }),
    delta: () => [0, 0],
  },
  {
    id: "ran", name: "藍", fullName: "八雲 藍", level: 6, color: "#e0b440",
    condText: "出目が 2 種類", skillText: "ダイス 1 個の出目を、今場に出ている任意の出目と同じ値に変える。",
    // カード: ちょうど 2 種類。Nim・2019: 2 種類以下（全部同じ目も含む）
    cond: (c, rules) => (rules === "card" ? kinds(c) === 2 : kinds(c) <= 2),
    gen: (c, emit, rules) => each1(c, (a) => { for (const b of VALUES) if (b !== a && c[b] > 0) emitChange(emit, rules, a, b); }),
    delta: () => [0, 0],
  },
  // ---- レベル 7 ----
  {
    id: "flandre", name: "フランドール", fullName: "フランドール・スカーレット", level: 7, color: "#e04848",
    condText: "1〜2 の出目が 7 個以上", skillText: "ダイス 2 個の出目に -1 する、またはダイス 1 個の出目に -2 する。",
    cond: (c) => c[1] + c[2] >= 7,
    gen: (c, emit, rules) => {
      // -2 は 1 で止める（Nim の 1.max(it - 2) と同じ。カードの解釈は rulesNotes）
      each1(c, (a) => { if (a > 1) emitChange(emit, rules, a, Math.max(1, a - 2)); });
      each2(c, (a, b) => { if (a <= b) emitChange2(emit, rules, a, a - 1, b, b - 1); });
    },
    delta: (rules) => (rules === "nim2019" ? [-2, 0] : [0, 0]),
  },
  {
    id: "kaguya", name: "輝夜", fullName: "蓬莱山 輝夜", level: 7, color: "#c8708f",
    condText: "同じ出目が 6 個以上", skillText: "ダイス 1 個の出目を 6 に変え、別のダイス 1 個の出目を 1 に変える。",
    cond: (c) => maxc(c) >= 6,
    gen: (c, emit, rules) => each2(c, (a, b) => emitChange2(emit, rules, a, 6, b, 1)),
    delta: () => [0, 0],
    label: (_k, rm) => `${rm[0]} を 6 に、${rm[1]} を 1 に`,
  },
  {
    id: "komachi", name: "小町", fullName: "小野塚 小町", level: 7, color: "#d2463c",
    condText: "出目の合計が 13", skillText: "ダイス 1 個を除外し、ダイスを 2 個振って追加する。",
    cond: (c) => sum(c) === 13,
    gen: (c, emit, rules) => { if (rules !== "nim2019") each1(c, (a) => emit(R(2), [a], [])); },
    delta: (rules) => (rules === "nim2019" ? [0, 0] : [1, 1]),
  },
  {
    id: "tenshi", name: "天子", fullName: "比那名居 天子", level: 7, color: "#4f8fd8",
    condText: "1〜4 が出ていない", skillText: "ダイス 1 個を振りなおす。その後、ダイス 1 個の出目を任意の値に変える。",
    cond: (c) => none(c, [1, 2, 3, 4]),
    gen: (c, emit, rules) => {
      if (rules === "nim2019") return;
      if (rules === "card") {
        // 振った目を見てから変えるダイスと値を選ぶ
        each1(c, (a) => emit("RC", [a], []));
        return;
      }
      // Nim: 変えるダイスと値を先に決めてから振る（skillOfTenshi）。振るダイスそのものを変えるのは「好きな目にする」と同じ
      each1(c, (a) => {
        emit("CR", [a], []);
        emit("A", [a], []);
      });
    },
    delta: () => [0, 0],
    label: (k, rm) => (k === "RC" ? `${rm[0]} を振り直し、見てから 1 個を好きな目に` : k === "CR" ? `先に 1 個を好きな目にしてから ${rm[0]} を振り直す` : `${rm[0]} を好きな目に`),
  },
  {
    id: "mokou", name: "妹紅", fullName: "藤原 妹紅", level: 7, color: "#e8e0d8",
    condText: "出目の合計が 38 以上", skillText: "ダイス 2 個の出目に +1 する、またはダイス 1 個の出目に +2 する。",
    cond: (c) => sum(c) >= 38,
    gen: (c, emit, rules) => {
      // カード: +2 は 6 で止める（フランの -2 と同じ扱い）。Nim・2019: 6.max(it + 2) なので 1〜4 は 6 に、5・6 は不可
      each1(c, (a) => {
        if (rules === "card") { if (a < 6) emitChange(emit, rules, a, Math.min(6, a + 2)); }
        else emitChange(emit, rules, a, Math.max(6, a + 2));
      });
      each2(c, (a, b) => { if (a <= b) emitChange2(emit, rules, a, a + 1, b, b + 1); });
    },
    delta: () => [0, 0],
  },
  // ---- レベル 8 ----
  {
    id: "suika", name: "萃香", fullName: "伊吹 萃香", level: 8, color: "#e08a3c",
    condText: "同じ出目が 7 個以上", skillText: "1〜6 から数を一つ選び、それに一致する出目のダイス全ての出目を、今最も個数の多い出目（のいずれか）の値に変える。",
    cond: (c) => maxc(c) >= 7,
    gen: (c, emit) => {
      const m = maxc(c);
      for (const i of VALUES) {
        if (c[i] === 0) continue;
        for (const j of VALUES) {
          if (j === i || c[j] !== m) continue;
          emit("", Array(c[i]).fill(i), Array(c[i]).fill(j));
        }
      }
    },
    delta: () => [0, 0],
    label: (_k, rm, ad) => `${rm[0]}（${rm.length} 個）を全て ${ad[0]} に`,
  },
  {
    id: "eiki", name: "映姫", fullName: "四季映姫・ヤマザナドゥ", level: 8, color: "#3f9b6e",
    condText: "出目の合計が 11 以下", skillText: "1〜6 の各出目のダイス 6 個を一組として、その内 4 個の出目をそれぞれ任意の値に変える。",
    cond: (c) => sum(c) <= 11,
    gen: (c, emit) => {
      if (VALUES.some((v) => c[v] === 0)) return;
      for (let a = 1; a <= 6; a++)
        for (let b = a + 1; b <= 6; b++)
          for (let d = b + 1; d <= 6; d++)
            for (let e = d + 1; e <= 6; e++) emit("AAAA", [a, b, d, e], []);
    },
    delta: () => [0, 0],
    label: (_k, rm) => `${join(rm)} をそれぞれ好きな目に`,
  },
  {
    id: "yukari", name: "紫", fullName: "八雲 紫", level: 8, color: "#8c5cc4",
    condText: "2〜5 が出ていない", skillText: "1〜6 から数を一つ選び、それと 1 差の出目のダイス全ての出目を、選んだ値に変える。",
    cond: (c) => none(c, [2, 3, 4, 5]),
    gen: (c, emit) => {
      for (const i of VALUES) {
        const rm: number[] = [];
        for (const v of [i - 1, i + 1]) if (v >= 1 && v <= 6) for (let x = 0; x < c[v]; x++) rm.push(v);
        if (rm.length) emit("", rm, Array(rm.length).fill(i));
      }
    },
    delta: () => [0, 0],
    label: (_k, rm, ad) => `${[...new Set(rm)].join("・")} を全て ${ad[0]} に`,
  },
  {
    id: "kanako", name: "神奈子", fullName: "八坂 神奈子", level: 8, color: "#b85a3a",
    condText: "出目の合計が 46 以上", skillText: "ダイスを 2 個振って追加する。その後、ダイス 2 個の出目をそれぞれ任意の値に変える。",
    cond: (c) => sum(c) >= 46,
    gen: (_c, emit, rules) => {
      if (rules === "nim2019") return;
      if (rules === "card") {
        emit("RRCC", [], []);
        return;
      }
      // Nim（skillOfKanako）: 変えるダイスを先に決める。元のダイス 2 個を変えてから 2 個振る／足す 2 個の目を決める／元の 1 個を変え、足す 1 個の目を決め、1 個振る
      if (total(_c) >= 2) emit("CCRR", [], []);
      emit("AA", [], []);
      emit("CAR", [], []);
    },
    delta: () => [2, 2],
    label: (k) => (k === "RRCC" ? "2 個振って足し、見てから 2 個を好きな目に" : k === "CCRR" ? "先に 2 個を好きな目にしてから 2 個振って足す" : k === "AA" ? "好きな目を 2 個足す" : "先に 1 個を好きな目にし、好きな目 1 個と振った 1 個を足す"),
  },
];

export const CHARA_BY_ID = new Map(CHARAS.map((c) => [c.id, c]));
export const LEVELS = [3, 4, 5, 6, 7, 8];
export const charasOfLevel = (lv: number) => CHARAS.filter((c) => c.level === lv);

export function labelOf(ch: Chara | null, kind: string, removes: number[], adds: number[], rules: Rules): string {
  return ch?.label?.(kind, removes, adds, rules) ?? describe(kind, removes, adds);
}

/** 編集の評価点: 同じ目の最大個数。全部が同じ目なら +1 */
export function editScore(c: Counts): number {
  const m = maxc(c);
  if (m === 0) return 0;
  return m + (kinds(c) === 1 ? 1 : 0);
}
