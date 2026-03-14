const SHORTCUTS = [
  { key: "Space", desc: "Submit kata" },
  { key: "Esc", desc: "Restart test" },
];

const STACK = [
  { label: "Frontend", value: "React 19 + Tailwind CSS v4" },
  { label: "Backend", value: "Cloudflare Workers + Hono" },
  { label: "Realtime", value: "Durable Objects + WebSocket" },
  { label: "Database", value: "Cloudflare D1 (SQLite)" },
  { label: "Build", value: "Vite + TypeScript" },
];

export default function AboutPage() {
  return (
    <main className="flex flex-col items-center px-4 py-8 sm:py-12" style={{ minHeight: "calc(100vh - 74px)" }}>
      <div className="w-full max-w-2xl flex flex-col gap-8 sm:gap-10">

        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0D0D0D]">
            Tentang TypeRace
          </h1>
          <p className="mt-3 text-base text-[#333333]/70 leading-relaxed">
            TypeRace adalah aplikasi pengukur kecepatan mengetik berbasis web.
            Ketik secepat mungkin, pantau WPM dan akurasi secara real-time,
            lalu lihat posisimu di leaderboard global yang update otomatis via WebSocket.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#333333]/50">
            Cara Main
          </h2>
          <ol className="flex flex-col gap-2 text-[#333333]">
            {[
              "Klaim username unikmu saat pertama kali membuka aplikasi.",
              "Pilih durasi test: 15s, 30s, 60s, atau 120s.",
              "Mulai mengetik — timer otomatis berjalan saat karakter pertama diketik.",
              "Lihat hasilmu dan cek leaderboard setelah waktu habis.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-bold text-[#0D0D0D] w-5 shrink-0">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#333333]/50">
            Keyboard Shortcuts
          </h2>
          <div className="flex flex-col gap-2">
            {SHORTCUTS.map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                <kbd className="bg-[#EDE8DC] px-2.5 py-1 rounded-lg text-xs font-mono font-semibold text-[#0D0D0D]/70 border border-[#0D0D0D]/10">
                  {s.key}
                </kbd>
                <span className="text-sm text-[#333333]">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#333333]/50">
            Tech Stack
          </h2>
          <div className="rounded-2xl bg-[#EDE8DC] overflow-hidden">
            {STACK.map((item, i) => (
              <div
                key={item.label}
                className={`flex items-center justify-between px-4 sm:px-5 py-3.5 ${i < STACK.length - 1 ? "border-b border-[#0D0D0D]/8" : ""}`}
              >
                <span className="text-sm font-medium text-[#333333]/60">{item.label}</span>
                <span className="text-sm font-semibold text-[#0D0D0D] text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
