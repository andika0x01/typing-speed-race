import type { LeaderboardEntry, ScoreRow } from "../types";

export async function getLeaderboard(db: D1Database): Promise<LeaderboardEntry[]> {
  const { results } = await db.prepare(
    `SELECT username,
            MAX(wpm)        AS wpm,
            raw_wpm,
            accuracy,
            duration,
            MAX(created_at) AS created_at
     FROM scores
     GROUP BY username
     ORDER BY MAX(wpm) DESC
     LIMIT 50`
  ).all<ScoreRow>();

  return results.map((row, i) => ({
    rank: i + 1,
    username: row.username,
    wpm: row.wpm,
    raw_wpm: row.raw_wpm,
    accuracy: row.accuracy,
    duration: row.duration,
    created_at: row.created_at,
  }));
}
