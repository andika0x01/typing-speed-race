import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { useSession } from "./hooks/useSession";
import NavBar from "./components/NavBar";
import UsernameModal from "./components/UsernameModal";
import TypingTest from "./pages/TypingTestPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AboutPage from "./pages/AboutPage";
import DuelPage from "./pages/DuelPage";

export default function App() {
  const { username, token, login, logout } = useSession();
  const [verified, setVerified] = useState(!username);

  useEffect(() => {
    if (!username || !token) {
      setVerified(true);
      return;
    }
    fetch(`/api/auth/verify?username=${encodeURIComponent(username)}&token=${encodeURIComponent(token)}`)
      .then((res) => {
        if (!res.ok) logout();
      })
      .catch(() => { /* network error — keep session, will fail on next action */ })
      .finally(() => setVerified(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!verified) return null;

  return (
    <>
      {!username && <UsernameModal onClaimed={login} />}
      <NavBar username={username} />
      <Routes>
        <Route path="/" element={<TypingTest username={username} />} />
        <Route path="/duel" element={<DuelPage username={username} />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </>
  );
}
