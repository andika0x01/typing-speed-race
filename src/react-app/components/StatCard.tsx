interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}

export default function StatCard({ label, value, unit, highlight }: StatCardProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl px-8 py-6 ${highlight ? "bg-[#1A1A1A] text-white" : "bg-[#EDE8DC] text-[#0D0D0D]"}`}>
      <span className={`text-4xl font-bold tracking-tight ${highlight ? "text-white" : "text-[#0D0D0D]"}`}>
        {value}
        {unit && <span className="text-xl font-medium ml-1 opacity-60">{unit}</span>}
      </span>
      <span className={`text-xs font-medium uppercase tracking-widest mt-1 ${highlight ? "text-white/60" : "text-[#0D0D0D]/50"}`}>
        {label}
      </span>
    </div>
  );
}
