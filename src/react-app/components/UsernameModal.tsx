import { useState, useRef, useEffect } from "react";

interface UsernameModalProps {
  onClaimed: (username: string, token: string) => void;
}

function validateUsername(val: string): string | null {
  if (val.length < 2) return "Minimal 2 karakter";
  if (val.length > 20) return "Maksimal 20 karakter";
  if (!/^[a-z0-9_]+$/.test(val)) return "Hanya huruf kecil, angka, dan underscore";
  return null;
}

export default function UsernameModal({ onClaimed }: UsernameModalProps) {
  const [value, setValue] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setValue(val);
    setErrorMsg("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateUsername(value);
    if (err) {
      setErrorMsg(err);
      return;
    }
    // No server registration — username is stored in localStorage by useSession
    // Scores are written to D1 by the GameSessionDO on each game finish.
    onClaimed(value, value); // token = username (session key)
  };

  const canSubmit = value.length >= 2 && value.length <= 20;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F5F0E8]">
      <div className="w-full max-w-sm flex flex-col gap-6 px-8">
        <div className="text-center">
          <div className="font-geist text-2xl font-bold tracking-tight text-[#0D0D0D] mb-1">
            type<span className="opacity-40">race</span>
          </div>
          <h2 className="text-3xl font-extrabold text-[#0D0D0D] tracking-tight mt-4">
            Pilih username
          </h2>
          <p className="text-sm text-[#333333]/60 mt-1">
            Username diklaim permanen di browser ini
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={handleChange}
              maxLength={20}
              placeholder="contoh: andika_123"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full bg-[#EDE8DC] text-[#0D0D0D] font-medium text-base px-4 py-3 rounded-xl border border-transparent focus:outline-none focus:border-[#1A1A1A] transition-all placeholder:text-[#0D0D0D]/30"
            />
            {errorMsg && (
              <p className="text-xs font-medium px-1 text-red-500">{errorMsg}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-[#1A1A1A] text-white px-6 py-3 rounded-xl font-semibold text-sm tracking-tight hover:bg-[#333333] transition-all duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Klaim Username
          </button>
        </form>

        <p className="text-center text-xs text-[#333333]/30">
          Hanya huruf kecil, angka, dan underscore · 2–20 karakter
        </p>
      </div>
    </div>
  );
}
