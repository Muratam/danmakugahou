// 重い処理（DP）はここで行う（画面を止めないため）。
import { query, skillTable, solve, type Setup, type StateQuery } from "./engine/session";
import type { Rules } from "./engine/charas";

export type WorkerRequest =
  | { type: "solve"; setup: Setup }
  | { type: "query"; setup: Setup; q: StateQuery }
  | { type: "table"; rules: Rules; level: number; help: number };

// 型は DOM の lib だけで書く（WebWorker の lib と同時には読めないため）
const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<{ id: number; req: WorkerRequest }>) => void) | null;
  postMessage(message: unknown): void;
};

ctx.onmessage = (e) => {
  const { id, req } = e.data;
  try {
    let last = 0;
    const progress = (d: number, t: number) => {
      const now = performance.now();
      if (now - last < 100 && d < t) return;
      last = now;
      ctx.postMessage({ id, progress: d / t });
    };
    const result =
      req.type === "solve" ? solve(req.setup, progress) : req.type === "query" ? query(req.setup, req.q) : skillTable(req.rules, req.level, req.help);
    ctx.postMessage({ id, ok: true, result });
  } catch (err) {
    ctx.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
