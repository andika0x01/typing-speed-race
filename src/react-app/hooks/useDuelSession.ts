import { useEffect, useRef, useCallback, useState } from "react";

export interface DuelResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  opponent: { username: string; wpm: number; rawWpm: number; accuracy: number } | null;
  winner: string | null; // username of winner, null = tie
}

export interface OpponentProgress {
  wpm: number;
  accuracy: number;
  wordsTyped: number;
}

export type DuelPhase =
  | "idle"
  | "creating"
  | "waiting"
  | "countdown"
  | "running"
  | "finished"
  | "disconnected";

interface UseDuelSessionResult {
  phase: DuelPhase;
  roomId: string | null;
  words: string[];
  timeLeft: number;
  opponentName: string | null;
  opponentProgress: OpponentProgress | null;
  result: DuelResult | null;
  role: "host" | "guest" | null;
  createRoom: (username: string) => void;
  joinRoom: (username: string, roomId: string) => void;
  sendWord: (typed: string, wordIndex: number) => void;
  reset: () => void;
}

const DUEL_DURATION = 60;

export function useDuelSession(): UseDuelSessionResult {
  const [phase, setPhase] = useState<DuelPhase>("idle");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(DUEL_DURATION);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [opponentProgress, setOpponentProgress] = useState<OpponentProgress | null>(null);
  const [result, setResult] = useState<DuelResult | null>(null);
  const [role, setRole] = useState<"host" | "guest" | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const closeWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    closeWs();
    setPhase("idle");
    setRoomId(null);
    setWords([]);
    setTimeLeft(DUEL_DURATION);
    setOpponentName(null);
    setOpponentProgress(null);
    setResult(null);
    setRole(null);
  }, [closeWs]);

  const openSocket = useCallback(
    (
      roomIdVal: string,
      roleVal: "host" | "guest",
      onOpen: (ws: WebSocket) => void
    ) => {
      closeWs();
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(
        `${proto}://${window.location.host}/api/ws/duel?room=${encodeURIComponent(roomIdVal)}&role=${roleVal}`
      );
      wsRef.current = ws;

      ws.onopen = () => onOpen(ws);

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data as string) as Record<string, unknown>;

          if (msg.type === "created") {
            setRoomId(msg.roomId as string);
            setPhase("waiting");
          } else if (msg.type === "ready") {
            setWords(msg.words as string[]);
            setOpponentName(msg.opponent as string);
            setTimeLeft(DUEL_DURATION);
            setPhase("countdown");
          } else if (msg.type === "go") {
            setPhase("running");
          } else if (msg.type === "tick") {
            setTimeLeft(msg.timeLeft as number);
            setPhase((p) => (p === "countdown" ? "running" : p));
          } else if (msg.type === "opponent_progress") {
            setOpponentProgress({
              wpm: msg.wpm as number,
              accuracy: msg.accuracy as number,
              wordsTyped: msg.wordsTyped as number,
            });
          } else if (msg.type === "finished") {
            const opp = msg.opponent as { username: string; wpm: number; rawWpm: number; accuracy: number } | null;
            setResult({
              wpm: msg.wpm as number,
              rawWpm: msg.rawWpm as number,
              accuracy: msg.accuracy as number,
              correctChars: msg.correctChars as number,
              incorrectChars: msg.incorrectChars as number,
              opponent: opp,
              winner: msg.winner as string | null,
            });
            setPhase("finished");
          } else if (msg.type === "opponent_disconnected") {
            setOpponentProgress(null);
            setOpponentName((n) => (n ? `${n} (left)` : null));
            // If still running, let the game finish naturally
          } else if (msg.type === "error") {
            console.error("Duel error:", msg.message);
            setPhase("idle");
          }
        } catch {
          /* ignore */
        }
      };

      ws.onerror = () => ws.close();
      ws.onclose = () =>
        setPhase((prev) =>
          prev === "finished" || prev === "idle" ? prev : "disconnected"
        );
    },
    [closeWs]
  );

  const createRoom = useCallback(
    async (username: string) => {
      setPhase("creating");
      // Ask the worker for a new room ID
      const res = await fetch("/api/duel/room");
      const { roomId: newRoomId } = (await res.json()) as { roomId: string };
      setRoomId(newRoomId);
      setRole("host");
      openSocket(newRoomId, "host", (ws) => {
        ws.send(JSON.stringify({ type: "create", username, roomId: newRoomId }));
      });
    },
    [openSocket]
  );

  const joinRoom = useCallback(
    (username: string, roomIdVal: string) => {
      const normalised = roomIdVal.trim().toUpperCase();
      setRole("guest");
      setPhase("countdown");
      openSocket(normalised, "guest", (ws) => {
        ws.send(JSON.stringify({ type: "join", username, roomId: normalised }));
      });
    },
    [openSocket]
  );

  const sendWord = useCallback((typed: string, wordIndex: number) => {
    wsRef.current?.send(JSON.stringify({ type: "word", typed, wordIndex }));
  }, []);

  useEffect(() => {
    return () => closeWs();
  }, [closeWs]);

  return {
    phase,
    roomId,
    words,
    timeLeft,
    opponentName,
    opponentProgress,
    result,
    role,
    createRoom,
    joinRoom,
    sendWord,
    reset,
  };
}
