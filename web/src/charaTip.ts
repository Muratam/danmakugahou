// キャラの撮影条件と能力を、アイコン・名前の近くに出す（解析・試行の画面）。出す箱は App.vue の CharaTip が 1 つだけ持つ。
//   マウス: 乗せると出て、離すと消える。キーボード: focus（:focus-visible）で出て、外すと消える。Esc でも消える。
//   タッチ: 長押しで出る（押せる部品でも押したことにはしない）。押しても何も起きない所（結果の一覧・行動の行）は軽く押しても出る。
//   ほかの所に触れる・スクロールする・幅が変わると消える。
import type { Directive } from "vue";
import { reactive } from "vue";

export const TIP_ID = "chara-tip";

export const tip = reactive<{ id: string | null; anchor: HTMLElement | null }>({ id: null, anchor: null });

const HOVER_DELAY = 200;
const LONG_PRESS = 450;
const MOVE_SLOP = 10;

interface Entry {
  id: string;
  timer: number;
  press: { x: number; y: number; timer: number } | null;
  /** 長押しで出したあとの click を 1 回だけ止める */
  swallow: boolean;
  /** 最後に触れたのが指（タッチ・ペン）か */
  touch: boolean;
  off: () => void;
}
const entries = new WeakMap<HTMLElement, Entry>();

export function show(el: HTMLElement) {
  const e = entries.get(el);
  if (!e) return;
  if (tip.anchor && tip.anchor !== el) tip.anchor.removeAttribute("aria-describedby");
  tip.id = e.id;
  tip.anchor = el;
  el.setAttribute("aria-describedby", TIP_ID);
}
export function hide(el?: HTMLElement) {
  if (el && tip.anchor !== el) return;
  tip.anchor?.removeAttribute("aria-describedby");
  tip.id = null;
  tip.anchor = null;
}

// ほかの所に触れたら消す（箱そのものに触れたときも消す）
let globalsOn = false;
function addGlobals() {
  if (globalsOn || typeof window === "undefined") return;
  globalsOn = true;
  document.addEventListener(
    "pointerdown",
    (ev) => {
      if (tip.anchor && !(ev.target instanceof Node && tip.anchor.contains(ev.target))) hide();
    },
    true,
  );
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") hide();
  });
  // キーボードで focus したときは、focus に合わせた自動のスクロールでは消さない（箱の側が位置を合わせ直す）
  window.addEventListener(
    "scroll",
    () => {
      if (!tip.anchor?.matches(":focus-visible")) hide();
    },
    { capture: true, passive: true },
  );
  window.addEventListener("resize", () => hide());
}

/** 押しても何も起きない要素か（そこでは軽く押しても出す） */
function inert(el: HTMLElement) {
  return !el.matches("button, a, input, select, textarea, [role='button']");
}

/** `v-chara-tip="id"`: この要素（アイコンと名前の入れ物）に、キャラ id の撮影条件と能力を出す */
export const vCharaTip: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    addGlobals();
    el.dataset.charaTip = "";
    // 押せない要素はキーボードで focus できるようにする
    if (inert(el) && !el.hasAttribute("tabindex")) el.tabIndex = 0;
    const e: Entry = { id: binding.value, timer: 0, press: null, swallow: false, touch: false, off: () => {} };
    const cancelPress = () => {
      if (e.press) clearTimeout(e.press.timer);
      e.press = null;
    };
    const onEnter = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      clearTimeout(e.timer);
      // 別のキャラの箱が出ているときはすぐ切り替える
      if (tip.anchor) show(el);
      else e.timer = window.setTimeout(() => show(el), HOVER_DELAY);
    };
    const onLeave = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse") return;
      clearTimeout(e.timer);
      if (!el.matches(":focus-visible")) hide(el);
    };
    const onDown = (ev: PointerEvent) => {
      e.touch = ev.pointerType !== "mouse";
      e.swallow = false;
      if (!e.touch) return;
      // 出ている箱の押せる部品を軽く押したら、押した扱いにして箱は消す
      if (tip.anchor === el && !inert(el)) hide();
      cancelPress();
      e.press = {
        x: ev.clientX,
        y: ev.clientY,
        timer: window.setTimeout(() => {
          e.press = null;
          e.swallow = true;
          show(el);
        }, LONG_PRESS),
      };
    };
    const onMove = (ev: PointerEvent) => {
      if (e.press && Math.hypot(ev.clientX - e.press.x, ev.clientY - e.press.y) > MOVE_SLOP) cancelPress();
    };
    const onClick = (ev: MouseEvent) => {
      if (e.swallow) {
        // 長押しで出したので、押した扱い（選ぶ・外す）にはしない
        e.swallow = false;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        return;
      }
      if (e.touch && inert(el)) {
        if (tip.anchor === el) hide();
        else show(el);
      }
    };
    // 長押しで出る端末のメニュー（画像の保存など）は出さない
    const onMenu = (ev: Event) => {
      if (e.touch) ev.preventDefault();
    };
    const onFocus = () => {
      if (el.matches(":focus-visible")) show(el);
    };
    const onBlur = () => hide(el);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", cancelPress);
    el.addEventListener("pointercancel", cancelPress);
    el.addEventListener("click", onClick, true);
    el.addEventListener("contextmenu", onMenu);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);
    e.off = () => {
      clearTimeout(e.timer);
      cancelPress();
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", cancelPress);
      el.removeEventListener("pointercancel", cancelPress);
      el.removeEventListener("click", onClick, true);
      el.removeEventListener("contextmenu", onMenu);
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
    };
    entries.set(el, e);
  },
  updated(el, binding) {
    const e = entries.get(el);
    if (!e || e.id === binding.value) return;
    e.id = binding.value;
    if (tip.anchor === el) tip.id = binding.value;
  },
  beforeUnmount(el) {
    entries.get(el)?.off();
    entries.delete(el);
    hide(el);
  },
};
