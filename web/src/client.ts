// Web Worker（src/worker.ts）を Promise で呼ぶ。DP は 1 本の Worker に順に積む（解いた結果を Worker が持つため）。
import type { SkillTableRow } from "./engine/api";
import type { Rules } from "./engine/charas";
import type { Setup, StateAnswer, StateQuery, Summary } from "./engine/session";
import type { WorkerRequest } from "./worker";

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; progress?: (p: number) => void }>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; ok?: boolean; result?: unknown; error?: string; progress?: number }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      if (e.data.progress !== undefined) {
        p.progress?.(e.data.progress);
        return;
      }
      pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.result);
      else p.reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      for (const p of pending.values()) p.reject(new Error(e.message || "計算に失敗しました"));
      pending.clear();
      worker = null;
    };
  }
  return worker;
}

function call<T>(req: WorkerRequest, progress?: (p: number) => void): Promise<T> {
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, progress });
    getWorker().postMessage({ id, req: JSON.parse(JSON.stringify(req)) });
  });
}

export const solve = (setup: Setup, progress?: (p: number) => void) => call<Summary>({ type: "solve", setup }, progress);
export const query = (setup: Setup, q: StateQuery) => call<StateAnswer>({ type: "query", setup, q });
export const skillTable = (rules: Rules, level: number, help: number) => call<SkillTableRow[]>({ type: "table", rules, level, help });
