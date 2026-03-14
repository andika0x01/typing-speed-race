import { useEffect, useRef, useCallback, useState } from "react";

export interface WordResult {
  wordIndex: number;
  correctChars: number;
  incorrectChars: number;
}

export interface GameResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
}

type ConnectionState = "disconnected" | "connecting" | "ready" | "running" | "finished";

interface UseGameSessionOptions {
  username: string | null;
  duration: number;
  key?: number;
}

interface UseGameSessionResult {
  words: string[];
  connState: ConnectionState;
  timeLeft: number;
  lastWordResult: WordResult | null;
  result: GameResult | null;
  sendStart: () => void;
  sendWord: (typed: string, wordIndex: number) => void;
  reconnect: () => void;
}

export function useGameSession({ username, duration }: UseGameSessionOptions): UseGameSessionResult {
  const [words, setWords] = useState<string[]>([]);
  const [connState, setConnState] = useState<ConnectionState>("disconnected");
  const [timeLeft, setTimeLeft] = useState(duration);
  const [lastWordResult, setLastWordResult] = useState<WordResult | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const connect = useCallback(() => {
    if (!username) return;
    wsRef.current?.close();

    setWords([]);
    setResult(null);
    setLastWordResult(null);
    setTimeLeft(duration);
    setConnState("connecting");

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/ws/game?username=${encodeURIComponent(username)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "init", username, duration: durationRef.current }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as Record<string, unknown>;
        if (msg.type === "ready") {
          setWords(msg.words as string[]);
          setConnState("ready");
        } else if (msg.type === "tick") {
          setTimeLeft(msg.timeLeft as number);
          setConnState("running");
        } else if (msg.type === "word_result") {
          setLastWordResult({
            wordIndex: msg.wordIndex as number,
            correctChars: msg.correctChars as number,
            incorrectChars: msg.incorrectChars as number,
          });
        } else if (msg.type === "finished") {
          setConnState("finished");
          setResult({
            wpm: msg.wpm as number,
            rawWpm: msg.rawWpm as number,
            accuracy: msg.accuracy as number,
            correctChars: msg.correctChars as number,
            incorrectChars: msg.incorrectChars as number,
          });
        }
      } catch {
        /* ignore */
      }
    };

    ws.onerror = () => ws.close();
    ws.onclose = () => setConnState((prev) => prev !== "finished" ? "disconnected" : prev);
  }, [username, duration]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const sendStart = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "start" }));
    setConnState("running");
  }, []);

  const sendWord = useCallback((typed: string, wordIndex: number) => {
    wsRef.current?.send(JSON.stringify({ type: "word", typed, wordIndex }));
  }, []);

  return { words, connState, timeLeft, lastWordResult, result, sendStart, sendWord, reconnect: connect };
}
