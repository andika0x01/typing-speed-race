import { DurableObject } from "cloudflare:workers";
import { getLeaderboard } from "../lib/leaderboard";
import { generateWords } from "../lib/words";
import type { LeaderboardEntry } from "../types";


const DUEL_DURATION = 60;
const WORD_COUNT = 100;

type RoomPhase = "waiting" | "countdown" | "running" | "finished";

interface PlayerState {
  username: string;
  correctChars: number;
  incorrectChars: number;
  totalTyped: number;
  wordsTyped: number;
  nextExpectedIndex: number;
  finished: boolean;
  startedAt: number | null;
}

interface RoomState {
  roomId: string;
  phase: RoomPhase;
  words: string[];
  startTime: number | null;
  host: PlayerState;
  guest: PlayerState | null;
}

type ClientMsg =
  | { type: "create"; username: string; roomId: string }
  | { type: "join"; username: string; roomId: string }
  | { type: "start" }
  | { type: "word"; typed: string; wordIndex: number }
  | { type: "ping" };

const TAG_HOST = "host";
const TAG_GUEST = "guest";

export class DuelRoomDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  private send(ws: WebSocket, data: unknown): void {
    try {
      ws.send(JSON.stringify(data));
    } catch {
      /* connection closed */
    }
  }

  private getWsByTag(tag: string): WebSocket | undefined {
    return this.ctx.getWebSockets(tag)[0];
  }

  private broadcastBoth(data: unknown): void {
    const hostWs = this.getWsByTag(TAG_HOST);
    const guestWs = this.getWsByTag(TAG_GUEST);
    if (hostWs) this.send(hostWs, data);
    if (guestWs) this.send(guestWs, data);
  }

  async fetch(request: Request): Promise<Response> {
    if (!request.headers.get("Upgrade")?.toLowerCase().includes("websocket")) {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const url = new URL(request.url);
    const role = url.searchParams.get("role") as "host" | "guest" | null;
    if (!role) return new Response("Missing role", { status: 400 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [role]);

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

    if (msg.type === "ping") {
      this.send(ws, { type: "pong" });
      return;
    }

    const tags = this.ctx.getTags(ws);
    const isHost = tags.includes(TAG_HOST);

    if (msg.type === "create") {
      const roomId = msg.roomId;
      const words = generateWords(WORD_COUNT);
      const state: RoomState = {
        roomId,
        phase: "waiting",
        words,
        startTime: null,
        host: {
          username: msg.username.toLowerCase(),
          correctChars: 0,
          incorrectChars: 0,
          totalTyped: 0,
          wordsTyped: 0,
          nextExpectedIndex: 0,
          finished: false,
          startedAt: null,
        },
        guest: null,
      };
      await this.ctx.storage.put("state", state);
      this.send(ws, { type: "created", roomId });
      return;
    }

    if (msg.type === "join") {
      const state = await this.ctx.storage.get<RoomState>("state");
      if (!state || state.phase !== "waiting") {
        this.send(ws, { type: "error", message: "Room not available" });
        return;
      }

      const guestUsername = msg.username.toLowerCase();
      if (guestUsername === state.host.username) {
        this.send(ws, { type: "error", message: "You cannot duel yourself" });
        return;
      }

      state.guest = {
        username: guestUsername,
        correctChars: 0,
        incorrectChars: 0,
        totalTyped: 0,
        wordsTyped: 0,
        nextExpectedIndex: 0,
        finished: false,
        startedAt: null,
      };
      state.phase = "countdown";
      await this.ctx.storage.put("state", state);

      const hostWs = this.getWsByTag(TAG_HOST);
      const readyPayload = {
        type: "ready",
        words: state.words,
        duration: DUEL_DURATION,
      };
      if (hostWs) {
        this.send(hostWs, { ...readyPayload, opponent: guestUsername, role: "host" });
      }
      this.send(ws, { ...readyPayload, opponent: state.host.username, role: "guest" });

      await this.ctx.storage.setAlarm(Date.now() + 3000);
      return;
    }

    if (msg.type === "word") {
      const state = await this.ctx.storage.get<RoomState>("state");
      if (!state || state.phase !== "running") return;

      const player = isHost ? state.host : state.guest;
      if (!player || player.finished) return;

      if (msg.wordIndex !== player.nextExpectedIndex) return;

      const elapsed = state.startTime ? Date.now() - state.startTime : 0;
      if (elapsed > DUEL_DURATION * 1000 + 2000) return;

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

      player.correctChars += correct;
      player.incorrectChars += incorrect;
      player.totalTyped += typed.length + 1;
      player.wordsTyped += 1;
      player.nextExpectedIndex = msg.wordIndex + 1;
      await this.ctx.storage.put("state", state);

      this.send(ws, {
        type: "word_result",
        wordIndex: msg.wordIndex,
        correctChars: correct,
        incorrectChars: incorrect,
      });

      const elapsedMin = elapsed / 1000 / 60;
      const liveWpm = elapsedMin > 0.01 ? Math.round((player.correctChars / 5) / elapsedMin) : 0;
      const total = player.correctChars + player.incorrectChars;
      const liveAcc = total > 0 ? Math.round((player.correctChars / total) * 100) : 100;

      const opponentWs = isHost ? this.getWsByTag(TAG_GUEST) : this.getWsByTag(TAG_HOST);
      if (opponentWs) {
        this.send(opponentWs, {
          type: "opponent_progress",
          wpm: liveWpm,
          accuracy: liveAcc,
          wordsTyped: player.wordsTyped,
        });
      }
      return;
    }
  }

  async alarm(): Promise<void> {
    const state = await this.ctx.storage.get<RoomState>("state");
    if (!state) return;

    if (state.phase === "countdown") {
      state.phase = "running";
      state.startTime = Date.now();
      await this.ctx.storage.put("state", state);
      this.broadcastBoth({ type: "go", startTime: state.startTime });
      await this.ctx.storage.setAlarm(Date.now() + 1000);
      return;
    }

    if (state.phase === "running" && state.startTime !== null) {
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      const timeLeft = Math.max(0, DUEL_DURATION - elapsed);

      this.broadcastBoth({ type: "tick", timeLeft });

      if (timeLeft <= 0) {
        await this.finalize(state);
      } else {
        await this.ctx.storage.setAlarm(Date.now() + 1000);
      }
    }
  }

  private calcStats(player: PlayerState) {
    const elapsedMin = DUEL_DURATION / 60;
    const wpm = Math.round((player.correctChars / 5) / elapsedMin);
    const rawWpm = Math.round((player.totalTyped / 5) / elapsedMin);
    const total = player.correctChars + player.incorrectChars;
    const accuracy = total > 0 ? Math.round((player.correctChars / total) * 100) : 0;
    return { wpm, rawWpm, accuracy };
  }

  private async finalize(state: RoomState): Promise<void> {
    state.host.finished = true;
    if (state.guest) state.guest.finished = true;
    state.phase = "finished";
    await this.ctx.storage.put("state", state);

    const hostStats = this.calcStats(state.host);
    const guestStats = state.guest ? this.calcStats(state.guest) : null;

    let winner: string | null = null;
    if (guestStats) {
      if (hostStats.wpm > guestStats.wpm) winner = state.host.username;
      else if (guestStats.wpm > hostStats.wpm) winner = state.guest!.username;
    }

    try {
      const stmts = [
        this.env.D1.prepare(
          "INSERT INTO scores (username, wpm, raw_wpm, accuracy, duration) VALUES (?1, ?2, ?3, ?4, ?5)"
        ).bind(state.host.username, hostStats.wpm, hostStats.rawWpm, hostStats.accuracy, DUEL_DURATION),
      ];
      if (state.guest && guestStats) {
        stmts.push(
          this.env.D1.prepare(
            "INSERT INTO scores (username, wpm, raw_wpm, accuracy, duration) VALUES (?1, ?2, ?3, ?4, ?5)"
          ).bind(state.guest.username, guestStats.wpm, guestStats.rawWpm, guestStats.accuracy, DUEL_DURATION)
        );
      }
      await this.env.D1.batch(stmts);

      const leaderboard: LeaderboardEntry[] = await getLeaderboard(this.env.D1);
      const doId = this.env.LEADERBOARD_DO.idFromName("global");
      const stub = this.env.LEADERBOARD_DO.get(doId);
      await stub.fetch("http://do/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaderboard),
      });
    } catch {
      /* D1 or leaderboard error */
    }

    const hostWs = this.getWsByTag(TAG_HOST);
    const guestWs = this.getWsByTag(TAG_GUEST);

    if (hostWs) {
      this.send(hostWs, {
        type: "finished",
        ...hostStats,
        correctChars: state.host.correctChars,
        incorrectChars: state.host.incorrectChars,
        opponent: guestStats ? { username: state.guest!.username, ...guestStats } : null,
        winner,
      });
    }

    if (guestWs && state.guest && guestStats) {
      this.send(guestWs, {
        type: "finished",
        ...guestStats,
        correctChars: state.guest.correctChars,
        incorrectChars: state.guest.incorrectChars,
        opponent: { username: state.host.username, ...hostStats },
        winner,
      });
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const tags = this.ctx.getTags(ws);
    const isHost = tags.includes(TAG_HOST);

    const state = await this.ctx.storage.get<RoomState>("state");
    if (state && state.phase !== "finished") {
      const opponentWs = isHost ? this.getWsByTag(TAG_GUEST) : this.getWsByTag(TAG_HOST);
      if (opponentWs) {
        this.send(opponentWs, { type: "opponent_disconnected" });
      }
    }
    ws.close();
  }

  async webSocketError(_ws: WebSocket): Promise<void> {
    /* no-op */
  }
}
