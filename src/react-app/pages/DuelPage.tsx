import { useState, useEffect, useRef, useCallback } from "react";
import { useDuelSession } from "../hooks/useDuelSession";
import type { CharState, CharResult, WordResult } from "../types";

interface DuelPageProps {
  username: string | null;
}

// ── Shared typing-area component ─────────────────────────────────────────────
interface TypingAreaProps {
  words: string[];
  wordResults: WordResult[];
  currentWordIndex: number;
  currentInput: string;
  isRunning: boolean;
  onFocusRequest?: () => void;
}

function OpponentTypingPreview({
  words,
  wordsTyped,
}: {
  words: string[];
  wordsTyped: number;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2 leading-relaxed select-none">
      {words.slice(0, Math.min(words.length, wordsTyped + 20)).map((word, wi) => (
        <span
          key={wi}
          className={`inline-flex text-base font-medium tracking-wide ${
            wi < wordsTyped ? "text-[#1A1A1A]/50" : "text-[#1A1A1A]/20"
          }`}
        >
          {word.split("").map((ch, ci) => (
            <span key={ci}>{ch}</span>
          ))}
        </span>
      ))}
    </div>
  );
}

function TypingArea({
  words,
  wordResults,
  currentWordIndex,
  currentInput,
  isRunning,
  onFocusRequest,
}: TypingAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const charRefs = useRef<(HTMLSpanElement | null)[][]>([]);
  const [caretPos, setCaretPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const wordEl = wordRefs.current[currentWordIndex];
    if (!wordEl || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const charsInWord = charRefs.current[currentWordIndex];
    const charIndex = currentInput.length;
    let targetEl: HTMLSpanElement | null = null;
    if (charsInWord && charIndex < charsInWord.length) {
      targetEl = charsInWord[charIndex];
    } else if (charsInWord && charsInWord.length > 0) {
      targetEl = charsInWord[charsInWord.length - 1];
    }
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const relTop = rect.top - containerRect.top + containerRef.current.scrollTop;
      const relLeft =
        charIndex < (charsInWord?.length ?? 0)
          ? rect.left - containerRect.left
          : rect.right - containerRect.left;
      setCaretPos({ top: relTop, left: relLeft });
    }
  }, [currentInput, currentWordIndex, wordResults]);

  useEffect(() => {
    const wordEl = wordRefs.current[currentWordIndex];
    if (wordEl && containerRef.current) {
      const cRect = containerRef.current.getBoundingClientRect();
      const wRect = wordEl.getBoundingClientRect();
      if (wRect.bottom - cRect.top > containerRef.current.clientHeight * 0.6) {
        containerRef.current.scrollTop += wRect.height + 8;
      }
      if (wRect.top - cRect.top < 0) containerRef.current.scrollTop = 0;
    }
  }, [currentWordIndex]);

  return (
    <div
      ref={containerRef}
      className="relative h-28 sm:h-36 overflow-hidden select-none rounded-2xl cursor-text"
      onClick={onFocusRequest}
    >
      {words.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <span className="text-[#0D0D0D]/30 text-sm font-medium animate-pulse">
            Loading words…
          </span>
        </div>
      ) : (
        <>
          {isRunning && (
            <div
              className="absolute w-0.5 rounded-full bg-[#1A1A1A] animate-pulse"
              style={{
                top: caretPos.top,
                left: caretPos.left,
                height: "1.6rem",
                transform: "translateY(1px)",
                transition: "top 60ms ease, left 60ms ease",
              }}
            />
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-2 leading-relaxed">
            {words.map((_word, wi) => (
              <span
                key={wi}
                ref={(el) => { wordRefs.current[wi] = el; }}
                className={`inline-flex text-xl sm:text-2xl font-medium tracking-wide transition-all ${
                  wi === currentWordIndex ? "rounded-sm" : "opacity-40"
                }`}
              >
                {wordResults[wi]?.chars.map((ch, ci) => (
                  <span
                    key={ci}
                    ref={(el) => {
                      if (!charRefs.current[wi]) charRefs.current[wi] = [];
                      charRefs.current[wi][ci] = el;
                    }}
                    className={`transition-colors duration-75 ${
                      wi === currentWordIndex
                        ? ch.state === "correct" ? "text-[#0D0D0D]"
                          : ch.state === "incorrect" ? "text-red-500"
                          : ch.state === "extra" ? "text-red-400"
                          : "text-[#0D0D0D]/30"
                        : wi < currentWordIndex
                        ? ch.state === "correct" ? "text-[#0D0D0D]/50" : "text-red-400/60"
                        : "text-[#0D0D0D]/30"
                    }`}
                  >
                    {ch.char}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main DuelPage ──────────────────────────────────────────────────────────────
export default function DuelPage({ username }: DuelPageProps) {
  const {
    phase,
    roomId,
    words,
    timeLeft,
    opponentName,
    opponentProgress,
    result,
    createRoom,
    joinRoom,
    sendWord,
    reset,
  } = useDuelSession();

  // Local typing state
  const [wordResults, setWordResults] = useState<WordResult[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [localCorrectChars, setLocalCorrectChars] = useState(0);
  const [localTotalTyped, setLocalTotalTyped] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  // Join form state
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const initWordResults = useCallback((w: string[]) => {
    return w.map((word) => ({
      chars: word.split("").map((c) => ({ char: c, state: "pending" as CharState })),
    }));
  }, []);

  useEffect(() => {
    if (words.length > 0) {
      setWordResults(initWordResults(words));
      setCurrentWordIndex(0);
      setCurrentInput("");
      setLocalCorrectChars(0);
      setLocalTotalTyped(0);
      startTimeRef.current = null;
    }
  }, [words, initWordResults]);

  // Focus input when game is running
  useEffect(() => {
    if (phase === "running") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [phase]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (phase !== "running") return;

    if (startTimeRef.current === null && val.length > 0) {
      startTimeRef.current = Date.now();
    }

    if (val.endsWith(" ")) {
      const typed = val.trimEnd();
      const target = words[currentWordIndex];
      if (!target) return;

      sendWord(typed, currentWordIndex);

      let correct = 0;
      for (let i = 0; i < Math.min(typed.length, target.length); i++) {
        if (typed[i] === target[i]) correct++;
      }
      setLocalCorrectChars((c) => c + correct);
      setLocalTotalTyped((t) => t + typed.length + 1);

      const newResults = [...wordResults];
      const newChars: CharResult[] = [];
      for (let i = 0; i < Math.max(typed.length, target.length); i++) {
        if (i < target.length) {
          newChars.push({
            char: target[i],
            state: i < typed.length ? (typed[i] === target[i] ? "correct" : "incorrect") : "incorrect",
          });
        } else {
          newChars.push({ char: typed[i], state: "extra" });
        }
      }
      newResults[currentWordIndex] = { chars: newChars };
      setWordResults(newResults);
      setCurrentWordIndex((i) => i + 1);
      setCurrentInput("");
    } else {
      setCurrentInput(val);
      const target = words[currentWordIndex];
      if (!target) return;
      const newResults = [...wordResults];
      const newChars: CharResult[] = target.split("").map((c, i) => ({
        char: c,
        state: i < val.length ? (val[i] === c ? "correct" : "incorrect") : "pending",
      }));
      for (let i = target.length; i < val.length; i++) {
        newChars.push({ char: val[i], state: "extra" });
      }
      newResults[currentWordIndex] = { chars: newChars };
      setWordResults(newResults);
    }
  };

  const calcLocalWpm = () => {
    if (!startTimeRef.current) return 0;
    const elapsedMin = (Date.now() - startTimeRef.current) / 1000 / 60;
    return elapsedMin > 0 ? Math.round((localCorrectChars / 5) / elapsedMin) : 0;
  };

  const localAccuracy =
    localTotalTyped > 0 ? Math.round((localCorrectChars / localTotalTyped) * 100) : 100;

  const progressPct = ((60 - timeLeft) / 60) * 100;

  const handleCopyLink = () => {
    if (!roomId) return;
    const url = `${window.location.origin}/duel?join=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    if (!username) return;
    createRoom(username);
  };

  const handleJoin = () => {
    if (!username) return;
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length !== 6) {
      setJoinError("Please enter a valid 6-character room code");
      return;
    }
    setJoinError("");
    joinRoom(username, code);
  };

  const handleReset = () => {
    reset();
    setWordResults([]);
    setCurrentInput("");
    setCurrentWordIndex(0);
    setLocalCorrectChars(0);
    setLocalTotalTyped(0);
    setShowJoinForm(false);
    setJoinCode("");
    setJoinError("");
  };

  // Check URL for ?join= param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get("join");
    if (joinParam && phase === "idle") {
      setJoinCode(joinParam.toUpperCase());
      setShowJoinForm(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── FINISHED ────────────────────────────────────────────────────────────────
  if (phase === "finished" && result) {
    const myWpm = result.wpm;
    const oppWpm = result.opponent?.wpm ?? 0;
    const isWinner = result.winner === username;
    const isTie = result.winner === null && result.opponent !== null;
    const soloGame = !result.opponent;

    return (
      <main className="flex flex-col items-center justify-center px-4 py-12" style={{ minHeight: "calc(100vh - 74px)" }}>
        <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
          {!soloGame && (
            <div className={`px-6 py-3 rounded-2xl text-center font-extrabold text-xl tracking-tight ${
              isTie ? "bg-[#EDE8DC] text-[#0D0D0D]"
              : isWinner ? "bg-[#1A1A1A] text-white"
              : "bg-red-100 text-red-700"
            }`}>
              {isTie ? "It's a Tie!" : isWinner ? "You Won!" : "You Lost"}
            </div>
          )}
          {soloGame && (
            <div className="px-6 py-3 rounded-2xl bg-[#EDE8DC] text-[#0D0D0D] font-extrabold text-xl tracking-tight text-center">
              Game Over
            </div>
          )}

          <div className={`grid gap-4 w-full ${!soloGame ? "grid-cols-2" : "grid-cols-1 max-w-xs mx-auto"}`}>
            <div className="bg-white border border-[#0D0D0D]/10 rounded-2xl p-5 flex flex-col gap-3">
              <div className="text-xs uppercase tracking-widest text-[#333]/50 font-semibold">You — {username}</div>
              <div className="flex gap-6">
                <div>
                  <div className="text-4xl font-extrabold text-[#0D0D0D] tabular-nums">{myWpm}</div>
                  <div className="text-xs uppercase tracking-widest text-[#333]/50 mt-0.5">WPM</div>
                </div>
                <div>
                  <div className="text-4xl font-extrabold text-[#0D0D0D] tabular-nums">{result.accuracy}%</div>
                  <div className="text-xs uppercase tracking-widest text-[#333]/50 mt-0.5">Accuracy</div>
                </div>
              </div>
              <div className="text-xs text-[#333]/40">Raw {result.rawWpm} WPM · {result.correctChars} correct · {result.incorrectChars} incorrect</div>
            </div>
            {!soloGame && result.opponent && (
              <div className="bg-[#EDE8DC]/50 border border-[#0D0D0D]/10 rounded-2xl p-5 flex flex-col gap-3">
                <div className="text-xs uppercase tracking-widest text-[#333]/50 font-semibold">Opponent — {result.opponent.username}</div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-4xl font-extrabold text-[#0D0D0D] tabular-nums">{oppWpm}</div>
                    <div className="text-xs uppercase tracking-widest text-[#333]/50 mt-0.5">WPM</div>
                  </div>
                  <div>
                    <div className="text-4xl font-extrabold text-[#0D0D0D] tabular-nums">{result.opponent.accuracy}%</div>
                    <div className="text-xs uppercase tracking-widest text-[#333]/50 mt-0.5">Accuracy</div>
                  </div>
                </div>
                <div className="text-xs text-[#333]/40">Raw {result.opponent.rawWpm} WPM</div>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 bg-[#1A1A1A] text-white px-8 py-3 rounded-xl font-semibold text-sm tracking-tight hover:bg-[#333] transition-all duration-200 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Play Again
          </button>
        </div>
      </main>
    );
  }

  // ── COUNTDOWN ───────────────────────────────────────────────────────────────
  if (phase === "countdown" || phase === "running") {
    const isRunning = phase === "running";

    return (
      <main style={{ minHeight: "calc(100vh - 74px)" }} className="flex flex-col">
        <div className="sm:hidden border-b border-[#0D0D0D]/10 px-4 py-2 flex items-center justify-between bg-[#EDE8DC]/60">
          <span className="text-xs font-semibold text-[#333]/60 truncate max-w-[120px]">
            vs {opponentName ?? "…"}
          </span>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-sm font-bold tabular-nums text-[#0D0D0D]">{opponentProgress?.wpm ?? 0}</div>
              <div className="text-[10px] uppercase tracking-widest text-[#333]/40">WPM</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold tabular-nums text-[#0D0D0D]">{opponentProgress?.accuracy ?? 100}%</div>
              <div className="text-[10px] uppercase tracking-widest text-[#333]/40">Acc</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold tabular-nums text-[#0D0D0D]">{opponentProgress?.wordsTyped ?? 0}</div>
              <div className="text-[10px] uppercase tracking-widest text-[#333]/40">Words</div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-10 border-r border-[#0D0D0D]/10">
            <div className="w-full max-w-xl flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-[#333]/50 font-semibold mb-0.5">You</div>
                  <div className="font-bold text-[#0D0D0D]">{username}</div>
                </div>
                <span
                  className={`font-geist text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tighter transition-colors duration-300 ${
                    timeLeft <= 5 && isRunning ? "text-red-500" : "text-[#0D0D0D]"
                  }`}
                >
                  {phase === "countdown" ? "..." : timeLeft}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-0.5 bg-[#EDE8DC] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1A1A1A] rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${isRunning ? progressPct : 0}%` }}
                />
              </div>
              {phase === "countdown" && (
                <div className="flex flex-col items-center justify-center h-36 gap-3">
                  <div className="text-5xl font-extrabold text-[#0D0D0D] animate-pulse">Get ready…</div>
                  <div className="text-sm text-[#333]/50">Opponent joined: <strong>{opponentName}</strong></div>
                </div>
              )}

              {phase === "running" && (
                <TypingArea
                  words={words}
                  wordResults={wordResults}
                  currentWordIndex={currentWordIndex}
                  currentInput={currentInput}
                  isRunning={isRunning}
                  onFocusRequest={() => inputRef.current?.focus()}
                />
              )}

              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={handleInput}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={!isRunning}
                className="sr-only"
              />

              {/* Live stats + focus button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-xl font-bold tabular-nums text-[#0D0D0D]">
                      {isRunning ? calcLocalWpm() : "—"}
                    </div>
                    <div className="text-xs uppercase tracking-widest text-[#333]/50 font-medium">wpm est.</div>
                  </div>
                  <div className="w-px h-8 bg-[#0D0D0D]/10" />
                  <div className="text-center">
                    <div className="text-xl font-bold tabular-nums text-[#0D0D0D]">
                      {isRunning ? `${localAccuracy}%` : "—"}
                    </div>
                    <div className="text-xs uppercase tracking-widest text-[#333]/50 font-medium">accuracy</div>
                  </div>
                </div>
                {isRunning && (
                  <button
                    onClick={() => inputRef.current?.focus()}
                    title="Click to focus typing area"
                    className="flex items-center gap-1.5 border border-[#1A1A1A]/20 text-[#333]/60 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#EDE8DC] transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                    Focus
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="hidden sm:flex flex-1 flex-col items-center justify-center px-4 py-10 bg-[#EDE8DC]/30">
            <div className="w-full max-w-xl flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-[#333]/50 font-semibold mb-0.5">Opponent</div>
                  <div className="font-bold text-[#0D0D0D]">{opponentName ?? "waiting…"}</div>
                </div>
              </div>
              <div className="h-28 sm:h-36 overflow-hidden rounded-2xl">
                <OpponentTypingPreview
                  words={words}
                  wordsTyped={opponentProgress?.wordsTyped ?? 0}
                />
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xl font-bold tabular-nums text-[#0D0D0D]">
                    {opponentProgress?.wpm ?? "—"}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-[#333]/50 font-medium">wpm est.</div>
                </div>
                <div className="w-px h-8 bg-[#0D0D0D]/10" />
                <div className="text-center">
                  <div className="text-xl font-bold tabular-nums text-[#0D0D0D]">
                    {opponentProgress ? `${opponentProgress.accuracy}%` : "—"}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-[#333]/50 font-medium">accuracy</div>
                </div>
                <div className="w-px h-8 bg-[#0D0D0D]/10" />
                <div className="text-center">
                  <div className="text-xl font-bold tabular-nums text-[#0D0D0D]">
                    {opponentProgress?.wordsTyped ?? 0}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-[#333]/50 font-medium">words</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── DISCONNECTED ─────────────────────────────────────────────────────────────
  if (phase === "disconnected") {
    return (
      <main className="flex flex-col items-center justify-center px-4 py-16" style={{ minHeight: "calc(100vh - 74px)" }}>
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="text-4xl font-bold text-[#0D0D0D]">!</div>
          <h2 className="text-2xl font-extrabold text-[#0D0D0D]">Connection lost</h2>
          <p className="text-sm text-[#333]/60">The connection to the server was lost.</p>
          <button
            onClick={handleReset}
            className="mt-2 flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#333] transition-all"
          >
            Back to Lobby
          </button>
        </div>
      </main>
    );
  }

  // ── LOBBY / IDLE / CREATING / WAITING ────────────────────────────────────────
  return (
    <main
      className="flex flex-col items-center justify-center px-4 py-12"
      style={{ minHeight: "calc(100vh - 74px)" }}
    >
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0D0D0D] leading-tight">
            Duel Mode
          </h1>
          <p className="mt-2 text-sm text-[#333]/60 font-medium">
            Race against a friend in real-time
          </p>
        </div>

        {(phase === "waiting" && roomId) && (
          <div className="flex flex-col gap-4 bg-[#EDE8DC]/60 border border-[#0D0D0D]/10 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm font-semibold text-[#0D0D0D]">Waiting for opponent…</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-xs uppercase tracking-widest text-[#333]/50 font-semibold">Room Code</div>
              <div className="text-4xl font-extrabold tracking-widest text-[#0D0D0D] font-mono">{roomId}</div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs text-[#333]/50 font-medium">Or share this link:</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-[#0D0D0D]/10 rounded-lg px-3 py-2 text-xs text-[#333] truncate">
                  {`${window.location.origin}/duel?join=${roomId}`}
                </code>
                <button
                  onClick={handleCopyLink}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    copied
                      ? "bg-green-100 text-green-700"
                      : "bg-[#1A1A1A] text-white hover:bg-[#333]"
                  }`}
                >
                  {copied ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-[#333]/50 hover:text-[#333] transition-colors underline-offset-2 underline self-start"
            >
              Cancel
            </button>
          </div>
        )}

        {(phase === "idle" || phase === "creating") && !showJoinForm && (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCreate}
              disabled={!username || phase === "creating"}
              className="w-full flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-6 py-3.5 rounded-xl font-semibold text-sm tracking-tight hover:bg-[#333] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phase === "creating" ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating room…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                  Create Room
                </>
              )}
            </button>
            <button
              onClick={() => setShowJoinForm(true)}
              disabled={!username}
              className="w-full flex items-center justify-center gap-2 border border-[#1A1A1A] text-[#1A1A1A] px-6 py-3.5 rounded-xl font-semibold text-sm tracking-tight hover:bg-[#1A1A1A] hover:text-white transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Join Room
            </button>
            {!username && (
              <p className="text-center text-xs text-[#333]/50">Please set a username first</p>
            )}
          </div>
        )}

        {(phase === "idle" || phase === "creating") && showJoinForm && (
          <div className="flex flex-col gap-4 bg-[#EDE8DC]/60 border border-[#0D0D0D]/10 rounded-2xl p-6">
            <div className="text-sm font-semibold text-[#0D0D0D]">Enter room code</div>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="e.g. A1B2C3"
              maxLength={6}
              className="w-full bg-white border border-[#0D0D0D]/15 rounded-xl px-4 py-3 text-2xl font-bold font-mono tracking-widest text-center text-[#0D0D0D] placeholder:text-[#333]/20 focus:outline-none focus:ring-2 focus:ring-[#0D0D0D]/20"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
            />
            {joinError && <p className="text-xs text-red-500">{joinError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleJoin}
                disabled={!username || joinCode.length !== 6}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1A1A1A] text-white px-4 py-2.5 rounded-xl font-semibold text-sm tracking-tight hover:bg-[#333] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join
              </button>
              <button
                onClick={() => { setShowJoinForm(false); setJoinCode(""); setJoinError(""); }}
                className="px-4 py-2.5 border border-[#0D0D0D]/15 rounded-xl text-sm font-semibold text-[#333] hover:bg-[#EDE8DC] transition-all"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {phase === "idle" && (
          <div className="flex flex-col gap-2 text-center">
            <div className="text-xs text-[#333]/40 font-medium">60 second race · same words for both players</div>
          </div>
        )}
      </div>
    </main>
  );
}
