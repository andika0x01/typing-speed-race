import { Hono } from "hono";
import { LeaderboardDO } from "./do/LeaderboardDO";
import { GameSessionDO } from "./do/GameSessionDO";
import { DuelRoomDO } from "./do/DuelRoomDO";

export { LeaderboardDO, GameSessionDO, DuelRoomDO };

const app = new Hono<{ Bindings: Env }>();

app.get("/api/ws/leaderboard", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return c.json({ error: "Expected WebSocket" }, 426);
  }
  const doId = c.env.LEADERBOARD_DO.idFromName("global");
  const stub = c.env.LEADERBOARD_DO.get(doId);
  return stub.fetch(new Request("http://do/ws", c.req.raw));
});

app.get("/api/ws/game", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return c.json({ error: "Expected WebSocket" }, 426);
  }
  const username = c.req.query("username");
  if (!username) return c.json({ error: "username required" }, 400);
  const doId = c.env.GAME_SESSION_DO.idFromName(username.toLowerCase());
  const stub = c.env.GAME_SESSION_DO.get(doId);
  return stub.fetch(c.req.raw);
});

app.post("/api/auth/register", async (c) => {
  const body = await c.req.json<{ username: string; token: string }>();
  const { username, token } = body;
  if (!username || !token) return c.json({ error: "Missing fields" }, 400);

  const existing = await c.env.D1.prepare(
    "SELECT token FROM users WHERE username = ?"
  ).bind(username).first<{ token: string }>();

  if (!existing) {
    await c.env.D1.prepare(
      "INSERT INTO users (username, token) VALUES (?, ?)"
    ).bind(username, token).run();
    return c.json({ ok: true }, 201);
  }

  if (existing.token === token) {
    return c.json({ ok: true }, 200);
  }

  return c.json({ error: "taken" }, 409);
});

app.get("/api/auth/verify", async (c) => {
  const username = c.req.query("username");
  const token = c.req.query("token");
  if (!username || !token) return c.json({ error: "Missing fields" }, 400);

  const row = await c.env.D1.prepare(
    "SELECT token FROM users WHERE username = ?"
  ).bind(username).first<{ token: string }>();

  if (row && row.token === token) return c.json({ ok: true });
  return c.json({ error: "invalid" }, 401);
});

app.get("/api/duel/room", async (c) => {
  const roomId = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return c.json({ roomId });
});

app.get("/api/ws/duel", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return c.json({ error: "Expected WebSocket" }, 426);
  }
  const roomId = c.req.query("room");
  const role = c.req.query("role");
  if (!roomId || !role) return c.json({ error: "room and role required" }, 400);
  if (role !== "host" && role !== "guest") return c.json({ error: "role must be host or guest" }, 400);

  const doId = c.env.DUEL_ROOM_DO.idFromName(roomId);
  const stub = c.env.DUEL_ROOM_DO.get(doId);
  const url = new URL(c.req.url);
  url.pathname = "/";
  return stub.fetch(new Request(url.toString(), c.req.raw));
});

export default app;
