export interface SessionData {
  username: string;
  token: string;
}

const SESSION_KEY = "typerace_session";

export function getSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionData;
    if (!parsed.username || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(data: SessionData): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
