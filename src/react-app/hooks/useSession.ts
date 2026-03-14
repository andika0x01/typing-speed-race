import { useState, useCallback } from "react";
import { getSession, setSession, clearSession } from "../lib/session";

export function useSession() {
  const session = getSession();
  const [username, setUsername] = useState<string | null>(() => session?.username ?? null);
  const [token, setToken] = useState<string | null>(() => session?.token ?? null);

  const login = useCallback((name: string, tok: string) => {
    setSession({ username: name, token: tok });
    setUsername(name);
    setToken(tok);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUsername(null);
    setToken(null);
  }, []);

  return { username, token, login, logout };
}

