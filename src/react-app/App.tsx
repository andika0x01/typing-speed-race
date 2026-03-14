import { Routes, Route } from "react-router-dom";
import { useSession } from "./hooks/useSession";
import NavBar from "./components/NavBar";
import UsernameModal from "./components/UsernameModal";
import TypingTest from "./pages/TypingTestPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AboutPage from "./pages/AboutPage";
import DuelPage from "./pages/DuelPage";

export default function App() {
  const { username, login } = useSession();

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
