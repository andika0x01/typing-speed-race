import { useState } from "react";
import { NavLink, Link } from "react-router-dom";

interface NavBarProps {
  username: string | null;
}

export default function NavBar({ username }: NavBarProps) {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `hover:text-[#0D0D0D] transition-colors duration-150 ${isActive ? "text-[#0D0D0D] font-semibold" : "text-[#333333]"}`;

  return (
    <nav className="w-full border-b border-[#0D0D0D]/10">
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5">
        <Link to="/" className="font-geist text-2xl font-bold tracking-tight text-[#0D0D0D]">
          type<span className="opacity-40">race</span>
        </Link>

        <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/duel" className={linkClass}>Duel</NavLink>
          <NavLink to="/leaderboard" className={linkClass}>Leaderboard</NavLink>
          <NavLink to="/about" className={linkClass}>About</NavLink>
        </div>

        <div className="flex items-center gap-3">
          {username && (
            <div className="text-xs sm:text-sm font-semibold text-[#0D0D0D]/60 bg-[#EDE8DC] px-2.5 sm:px-3 py-1.5 rounded-lg max-w-[100px] truncate">
              {username}
            </div>
          )}
          <button
            className="sm:hidden flex flex-col gap-1.5 p-1"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            <span className={`block w-5 h-0.5 bg-[#0D0D0D] transition-all ${open ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-[#0D0D0D] transition-all ${open ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-[#0D0D0D] transition-all ${open ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="sm:hidden flex flex-col px-5 pb-4 gap-4 text-sm font-medium border-t border-[#0D0D0D]/5 pt-4">
          <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/duel" className={linkClass} onClick={() => setOpen(false)}>Duel</NavLink>
          <NavLink to="/leaderboard" className={linkClass} onClick={() => setOpen(false)}>Leaderboard</NavLink>
          <NavLink to="/about" className={linkClass} onClick={() => setOpen(false)}>About</NavLink>
        </div>
      )}
    </nav>
  );
}
