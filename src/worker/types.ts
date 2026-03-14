export interface UserRow {
  username: string;
  created_at: number;
}

export interface ScoreRow {
  id: number;
  username: string;
  wpm: number;
  raw_wpm: number;
  accuracy: number;
  duration: number;
  created_at: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  wpm: number;
  raw_wpm: number;
  accuracy: number;
  duration: number;
  created_at: number;
}
