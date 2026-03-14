import { useState, useEffect, useRef, useCallback } from "react";
import { useGameSession } from "../hooks/useGameSession";
import type { CharState, CharResult, WordResult } from "../types";
import ResultsScreen from "../components/ResultsScreen";

const TIMER_OPTIONS = [15, 30, 60, 120] as const;
type TimerOption = typeof TIMER_OPTIONS[number];

interface TypingTestPageProps {
  username: string | null;
}

export default function TypingTestPage({ username }: TypingTestPageProps) {
  const [timerOption, setTimerOption] = useState<TimerOption>(30);
  const [localWordResults, setLocalWordResults] = useState<WordResult[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [localCorrectChars, setLocalCorrectChars] = useState(0);
  const [localTotalTyped, setLocalTotalTyped] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [caretPos, setCaretPos] = useState({ top: 0, left: 0 });
  const [sessionKey, setSessionKey] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const charRefs = useRef<(HTMLSpanElement | null)[][]>([]);
  const startTimeRef = useRef<number | null>(null);

  const {
    words,
    connState,
    timeLeft: serverTimeLeft,
    result,
    sendStart,
    sendWord,
    reconnect,
  } = useGameSession({ username, duration: timerOption, key: sessionKey });

  const timeLeft = serverTimeLeft;
  const isRunning = connState === "running";
  const isFinished = connState === "finished";
  const isReady = connState === "ready";

  const initLocalWordResults = useCallback((w: string[]) => {
    return w.map((word) => ({
      chars: word.split("").map((c) => ({ char: c, state: "pending" as CharState })),
    }));
  }, []);

  useEffect(() => {
    if (words.length > 0) {
      setLocalWordResults(initLocalWordResults(words));
      setCurrentWordIndex(0);
      setCurrentInput("");
      setLocalCorrectChars(0);
      setLocalTotalTyped(0);
      setGameStarted(false);
      startTimeRef.current = null;
      charRefs.current = [];
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [words, initLocalWordResults]);

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
  }, [currentInput, currentWordIndex, localWordResults]);

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

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!isReady && !isRunning) return;
    if (isFinished) return;

    if (!gameStarted && val.length > 0) {
      setGameStarted(true);
      startTimeRef.current = Date.now();
      sendStart();
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

      const newResults = [...localWordResults];
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
      setLocalWordResults(newResults);
      setCurrentWordIndex((i) => i + 1);
      setCurrentInput("");
    } else {
      setCurrentInput(val);
      const target = words[currentWordIndex];
      if (!target) return;
      const newResults = [...localWordResults];
      const newChars: CharResult[] = target.split("").map((c, i) => ({
        char: c,
        state: i < val.length ? (val[i] === c ? "correct" : "incorrect") : "pending",
      }));
      for (let i = target.length; i < val.length; i++) {
        newChars.push({ char: val[i], state: "extra" });
      }
      newResults[currentWordIndex] = { chars: newChars };
      setLocalWordResults(newResults);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") handleReset();
  };

  const handleReset = useCallback(() => {
    setCurrentInput("");
    setCurrentWordIndex(0);
    setLocalWordResults([]);
    setLocalCorrectChars(0);
    setLocalTotalTyped(0);
    setGameStarted(false);
    startTimeRef.current = null;
    charRefs.current = [];
    setSessionKey((k) => k + 1);
    reconnect();
  }, [reconnect]);

  const handleTimerChange = (t: TimerOption) => {
    if (isRunning) return;
    setTimerOption(t);
    setSessionKey((k) => k + 1);
    reconnect();
  };

  const calcLocalWpm = () => {
    if (!startTimeRef.current) return 0;
    const elapsedMin = (Date.now() - startTimeRef.current) / 1000 / 60;
    return elapsedMin > 0 ? Math.round((localCorrectChars / 5) / elapsedMin) : 0;
  };

  const localAccuracy =
    localTotalTyped > 0
      ? Math.round((localCorrectChars / localTotalTyped) * 100)
      : 100;

  const progressPct = ((timerOption - timeLeft) / timerOption) * 100;

  if (isFinished && result) {
    return (
      <main
        className="flex flex-col items-center justify-center px-4 py-12"
        style={{ minHeight: "calc(100vh - 74px)" }}
      >
        <ResultsScreen
          wpm={result.wpm}
          rawWpm={result.rawWpm}
          accuracy={result.accuracy}
          correctChars={result.correctChars}
          incorrectChars={result.incorrectChars}
          timeSeconds={timerOption}
          onRestart={handleReset}
        />
      </main>
    );
  }

  return (
    <main
      className="flex flex-col items-center justify-center px-4 py-8 sm:py-10"
      style={{ minHeight: "calc(100vh - 74px)" }}
    >
      <div className="w-full max-w-3xl flex flex-col gap-6 sm:gap-8">

        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0D0D0D] leading-tight">
            Typing Speed Test
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#333333]/60 font-medium">
            {(connState === "disconnected" || connState === "connecting") && "Connecting to server..."}
            {connState === "ready" && "Click Start or just type to begin"}
            {connState === "running" && "Keep going, you got this!"}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 bg-[#EDE8DC] rounded-xl p-1">
            {TIMER_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => handleTimerChange(t)}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 tracking-tight ${
                  timerOption === t
                    ? "bg-[#1A1A1A] text-white shadow-sm"
                    : "text-[#333333] hover:text-[#0D0D0D]"
                } ${isRunning ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                {t}s
              </button>
            ))}
          </div>

          <span
            className={`font-geist text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tighter transition-colors duration-300 ${
              timeLeft <= 5 && isRunning ? "text-red-500" : "text-[#0D0D0D]"
            }`}
          >
            {timeLeft}
          </span>
        </div>

        <div className="h-0.5 bg-[#EDE8DC] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1A1A1A] rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${isRunning ? progressPct : 0}%` }}
          />
        </div>

        <div
          ref={containerRef}
          className="relative h-28 sm:h-36 overflow-hidden select-none rounded-2xl"
          onClick={() => inputRef.current?.focus()}
        >
          {words.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-[#0D0D0D]/30 text-sm font-medium animate-pulse">
                Loading words...
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
                    {localWordResults[wi]?.chars.map((ch, ci) => (
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

        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          disabled={!isReady && !isRunning}
          className="sr-only"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold tabular-nums text-[#0D0D0D]">
                {isRunning ? calcLocalWpm() : "—"}
              </div>
              <div className="text-xs uppercase tracking-widest text-[#333333]/50 font-medium">wpm est.</div>
            </div>
            <div className="w-px h-8 bg-[#0D0D0D]/10" />
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold tabular-nums text-[#0D0D0D]">
                {isRunning ? `${localAccuracy}%` : "—"}
              </div>
              <div className="text-xs uppercase tracking-widest text-[#333333]/50 font-medium">accuracy</div>
            </div>
          </div>

          <button
            onClick={() => isRunning ? handleReset() : inputRef.current?.focus()}
            title={isRunning ? "Restart (Esc)" : "Start"}
            className="flex items-center gap-2 border border-[#1A1A1A] text-[#1A1A1A] px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold tracking-tight hover:bg-[#1A1A1A] hover:text-white transition-all duration-200 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {isRunning ? (
                <>
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </>
              ) : (
                <polygon points="5 3 19 12 5 21 5 3" />
              )}
            </svg>
            {isRunning ? "Restart" : "Start"}
          </button>
        </div>

        {(isReady || connState === "disconnected") && (
          <p className="text-center text-xs text-[#333333]/40 font-medium">
            Press <kbd className="bg-[#EDE8DC] px-1.5 py-0.5 rounded text-[#0D0D0D]/60 font-mono text-xs">Esc</kbd> anytime to restart
          </p>
        )}

      </div>
    </main>
  );
}
