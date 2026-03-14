import { useEffect, useState, useRef, useCallback } from "react";
import type { LeaderboardEntry } from "../lib/api";

type Status = "connecting" | "connected" | "disconnected";

interface UseLeaderboardWSResult {
  entries: LeaderboardEntry[];
  status: Status;
}

export function useLeaderboardWS(): UseLeaderboardWSResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [status, setStatus] = useState<Status>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);

  const connect = useCallback(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/ws/leaderboard`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      retryCount.current = 0;
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as LeaderboardEntry[];
        setEntries(data);
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      const delay = Math.min(1000 * 2 ** retryCount.current, 30000);
      retryCount.current++;
      retryRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { entries, status };
}
