CREATE TABLE IF NOT EXISTS users (
  username   TEXT PRIMARY KEY,
  token      TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT    NOT NULL,
  wpm        INTEGER NOT NULL,
  raw_wpm    INTEGER NOT NULL,
  accuracy   INTEGER NOT NULL,
  duration   INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_scores_wpm ON scores(wpm DESC);
CREATE INDEX IF NOT EXISTS idx_scores_username ON scores(username);
