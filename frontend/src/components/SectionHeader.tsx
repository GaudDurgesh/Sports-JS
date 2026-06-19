// src/components/SectionHeader.tsx
// Section label with optional live-pulse dot and a count pill.

interface Props {
  label: string;
  count: number;
  isLive?: boolean;
}

export function SectionHeader({ label, count, isLive }: Props) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      {isLive && (
        <span
          className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0"
          style={{ animation: "tickerPulse 1.4s ease-in-out infinite" }}
        />
      )}
      <span className="text-white text-[15px] font-semibold">{label}</span>
      <span className="bg-white/[0.08] text-white/45 text-[11px] font-medium px-2 py-0.5 rounded-full">
        {count}
      </span>
    </div>
  );
}