import { DurableObject } from "cloudflare:workers";
import { getLeaderboard } from "../lib/leaderboard";
import { generateWords } from "../lib/words";
import type { LeaderboardEntry } from "../types";



interface SessionState {
  username: string;
  duration: number;
  words: string[];
  startTime: number | null;
  correctChars: number;
  incorrectChars: number;
  totalTyped: number;
  finished: boolean;
  nextExpectedIndex: number;
}

type ClientMsg =
  | { type: "init"; username: string; duration: number }
  | { type: "start" }
  | { type: "word"; typed: string; wordIndex: number };

export class GameSessionDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private getWs(): WebSocket | undefined {
    return this.ctx.getWebSockets()[0];
  }

  private send(ws: WebSocket, data: unknown): void {
    try {
      ws.send(JSON.stringify(data));
    } catch {
      /* connection closed */
    }
  }

  async fetch(request: Request): Promise<Response> {
    if (!request.headers.get("Upgrade")?.toLowerCase().includes("websocket")) {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;

    let msg: ClientMsg;
    try {
      msg = JSON.parse(message) as ClientMsg;
    } catch {
      return;
    }

    if (msg.type === "init") {
      const words = generateWords(80);
      const state: SessionState = {
        username: msg.username.toLowerCase(),
        duration: msg.duration,
        words,
        startTime: null,
        correctChars: 0,
        incorrectChars: 0,
        totalTyped: 0,
        finished: false,
        nextExpectedIndex: 0,
      };
      await this.ctx.storage.put("state", state);
      this.send(ws, { type: "ready", words });
      return;
    }

    const state = await this.ctx.storage.get<SessionState>("state");
    if (!state || state.finished) return;

    if (msg.type === "start" && state.startTime === null) {
      state.startTime = Date.now();
      await this.ctx.storage.put("state", state);
      await this.ctx.storage.setAlarm(Date.now() + 1000);
      return;
    }

    if (msg.type === "word" && state.startTime !== null) {
      if (msg.wordIndex !== state.nextExpectedIndex) return;

      const elapsed = Date.now() - state.startTime;
      if (elapsed > state.duration * 1000 + 2000) return;

      const target = state.words[msg.wordIndex];
      if (!target) return;

      const typed = msg.typed;
      let correct = 0;
      let incorrect = 0;

      for (let i = 0; i < Math.max(typed.length, target.length); i++) {
        if (i < typed.length && i < target.length && typed[i] === target[i]) {
          correct++;
        } else {
          incorrect++;
        }
      }

      state.correctChars += correct;
      state.incorrectChars += incorrect;
      state.totalTyped += typed.length + 1;
      state.nextExpectedIndex = msg.wordIndex + 1;
      await this.ctx.storage.put("state", state);

      this.send(ws, { type: "word_result", wordIndex: msg.wordIndex, correctChars: correct, incorrectChars: incorrect });
    }
  }

  async alarm(): Promise<void> {
    const state = await this.ctx.storage.get<SessionState>("state");
    if (!state || state.finished || state.startTime === null) return;

    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const timeLeft = Math.max(0, state.duration - elapsed);
    const ws = this.getWs();

    if (ws) {
      this.send(ws, { type: "tick", timeLeft });
    }

    if (timeLeft <= 0) {
      await this.finalize(state, ws);
    } else {
      await this.ctx.storage.setAlarm(Date.now() + 1000);
    }
  }

  private async finalize(state: SessionState, ws: WebSocket | undefined): Promise<void> {
    state.finished = true;
    await this.ctx.storage.put("state", state);

    const elapsedMin = state.duration / 60;
    const wpm = Math.round((state.correctChars / 5) / elapsedMin);
    const rawWpm = Math.round((state.totalTyped / 5) / elapsedMin);
    const total = state.correctChars + state.incorrectChars;
    const accuracy = total > 0 ? Math.round((state.correctChars / total) * 100) : 0;

    try {
      await this.env.D1.prepare(
        "INSERT INTO scores (username, wpm, raw_wpm, accuracy, duration) VALUES (?1, ?2, ?3, ?4, ?5)"
      ).bind(state.username, wpm, rawWpm, accuracy, state.duration).run();

      const leaderboard: LeaderboardEntry[] = await getLeaderboard(this.env.D1);
      const doId = this.env.LEADERBOARD_DO.idFromName("global");
      const stub = this.env.LEADERBOARD_DO.get(doId);
      await stub.fetch("http://do/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaderboard),
      });
    } catch {
      /* D1 or DO error */
    }

    if (ws) {
      this.send(ws, {
        type: "finished",
        wpm,
        rawWpm,
        accuracy,
        correctChars: state.correctChars,
        incorrectChars: state.incorrectChars,
      });
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    ws.close();
  }

  async webSocketError(_ws: WebSocket): Promise<void> {
    /* no-op */
  }
}
