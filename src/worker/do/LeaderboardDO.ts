import { DurableObject } from "cloudflare:workers";
import type { LeaderboardEntry } from "../types";

export class LeaderboardDO extends DurableObject {
  private sessions: Set<WebSocket> = new Set();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.getWebSockets().forEach((ws) => this.sessions.add(ws));
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      this.sessions.add(server);

      const stored = await this.ctx.storage.get<LeaderboardEntry[]>("leaderboard");
      if (stored) {
        server.send(JSON.stringify(stored));
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/broadcast" && request.method === "POST") {
      const leaderboard = await request.json<LeaderboardEntry[]>();
      await this.ctx.storage.put("leaderboard", leaderboard);
      const msg = JSON.stringify(leaderboard);
      this.sessions.forEach((ws) => {
        try {
          ws.send(msg);
        } catch {
          this.sessions.delete(ws);
        }
      });
      return new Response("ok");
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.sessions.delete(ws);
    ws.close();
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.sessions.delete(ws);
  }
}
