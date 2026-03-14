import StatCard from "./StatCard";

interface ResultsScreenProps {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  timeSeconds: number;
  onRestart: () => void;
}

export default function ResultsScreen({
  wpm,
  rawWpm,
  accuracy,
  correctChars,
  incorrectChars,
  timeSeconds,
  onRestart,
}: ResultsScreenProps) {
  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto px-4">
      <div className="text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0D0D0D] tracking-tight">Test Complete</h2>
        <p className="text-[#333333]/60 mt-1 text-sm font-medium">Here's how you did</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
        <StatCard label="WPM" value={wpm} highlight />
        <StatCard label="Accuracy" value={accuracy} unit="%" />
        <StatCard label="Raw WPM" value={rawWpm} />
        <StatCard label="Time" value={timeSeconds} unit="s" />
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#1A1A1A] inline-block" />
          <span className="text-[#333333]"><strong>{correctChars}</strong> correct</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          <span className="text-[#333333]"><strong>{incorrectChars}</strong> incorrect</span>
        </div>
      </div>

      <button
        onClick={onRestart}
        className="flex items-center gap-2 bg-[#1A1A1A] text-white px-8 py-3 rounded-xl font-semibold text-sm tracking-tight hover:bg-[#333333] transition-all duration-200 active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        Try Again
      </button>
    </div>
  );
}
