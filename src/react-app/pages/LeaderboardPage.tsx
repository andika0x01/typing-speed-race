import { useLeaderboardWS } from "../hooks/useLeaderboardWS";

const DURATION_LABELS: Record<number, string> = { 15: "15s", 30: "30s", 60: "60s", 120: "120s" };

function formatDate(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusDot({ status }: { status: "connecting" | "connected" | "disconnected" }) {
  const color =
    status === "connected" ? "bg-green-500" :
    status === "connecting" ? "bg-yellow-400" :
    "bg-red-400";
  const label =
    status === "connected" ? "Live" :
    status === "connecting" ? "Connecting..." :
    "Reconnecting...";

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color} ${status === "connected" ? "animate-pulse" : ""}`} />
      <span className="text-xs font-medium text-[#333333]/60">{label}</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-t border-[#0D0D0D]/5">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-3 py-3 sm:px-4">
          <div className="h-4 rounded bg-[#EDE8DC] animate-pulse" style={{ width: i === 1 ? "80px" : "48px" }} />
        </td>
      ))}
    </tr>
  );
}

export default function LeaderboardPage() {
  const { entries, status } = useLeaderboardWS();
  const loading = status === "connecting";
  const wsEntries = entries;

  return (
    <main className="flex flex-col items-center px-4 py-8 sm:py-12" style={{ minHeight: "calc(100vh - 74px)" }}>
      <div className="w-full max-w-3xl flex flex-col gap-6 sm:gap-8">

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0D0D0D]">Leaderboard</h1>
            <p className="text-sm text-[#333333]/50 mt-1 font-medium">Best score per player — ranked by WPM</p>
          </div>
          <StatusDot status={status} />
        </div>

        <div className="rounded-2xl overflow-hidden border border-[#0D0D0D]/8 overflow-x-auto">
          <table className="w-full text-sm text-[#0D0D0D] min-w-[480px]">
            <thead>
              <tr className="bg-[#EDE8DC] text-xs uppercase tracking-widest text-[#333333]/60 font-semibold">
                <th className="px-3 py-3 sm:px-4 text-left w-10">#</th>
                <th className="px-3 py-3 sm:px-4 text-left">Username</th>
                <th className="px-3 py-3 sm:px-4 text-right">WPM</th>
                <th className="px-3 py-3 sm:px-4 text-right">Accuracy</th>
                <th className="px-3 py-3 sm:px-4 text-right hidden sm:table-cell">Durasi</th>
                <th className="px-3 py-3 sm:px-4 text-right hidden md:table-cell">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {loading && wsEntries.length === 0 ? (
                [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-[#333333]/40 font-medium">
                    Belum ada skor. Jadilah yang pertama!
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr
                    key={e.username}
                    className="border-t border-[#0D0D0D]/5 hover:bg-[#EDE8DC]/60 transition-colors duration-100"
                  >
                    <td className="px-3 py-3 sm:px-4 font-bold tabular-nums text-[#0D0D0D]/40">
                      {e.rank}
                    </td>
                    <td className="px-3 py-3 sm:px-4 font-semibold">{e.username}</td>
                    <td className="px-3 py-3 sm:px-4 text-right font-bold tabular-nums">{e.wpm}</td>
                    <td className="px-3 py-3 sm:px-4 text-right tabular-nums text-[#333333]">{e.accuracy}%</td>
                    <td className="px-3 py-3 sm:px-4 text-right text-[#333333]/60 hidden sm:table-cell">
                      {DURATION_LABELS[e.duration] ?? `${e.duration}s`}
                    </td>
                    <td className="px-3 py-3 sm:px-4 text-right text-[#333333]/50 hidden md:table-cell">
                      {formatDate(e.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  );
}
