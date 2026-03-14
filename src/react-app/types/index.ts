export type CharState = "pending" | "correct" | "incorrect" | "extra";
export type GameState = "idle" | "running" | "finished";
export type TimerOption = 15 | 30 | 60 | 120;

export interface CharResult {
  char: string;
  state: CharState;
}

export interface WordResult {
  chars: CharResult[];
  skipped?: boolean;
}
