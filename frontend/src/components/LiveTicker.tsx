// src/components/LiveTicker.tsx
// Scrolling banner of live matches shown at the top of the home page.

import type { Match } from "../types";

const SPORT_CONFIG = {
  cricket:  { emoji: "🏏", accent: "#14B8A6" },
  football: { emoji: "⚽", accent: "#3B82F6" },
} as const;

function getSportAccent(sport: string) {
  return SPORT_CONFIG[sport as keyof typeof SPORT_CONFIG]?.accent ?? "#6B7280";
}

interface Props {
  matches: Match[];
}

export function LiveTicker({ matches }: Props) {
  const live = matches.filter((m) => m.status === "live");
  if (live.length === 0) return null;

  // Duplicate for seamless loop
  const items = [...live, ...live];

  return (
    <div className="overflow-hidden relative border-b border-amber-500/20 bg-amber-500/[0.08]">
      <div className="flex items-center">
        {/* "LIVE" label pill */}
        <div className="shrink-0 flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/15 border-r border-amber-500/20 z-10">
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#F59E0B",
              display: "inline-block",
              animation: "tickerPulse 1.4s ease-in-out infinite",
            }}
          />
          <span className="text-amber-400 text-[11px] font-bold tracking-widest">
            LIVE
          </span>
        </div>

        {/* Scrolling items */}
        <div className="overflow-hidden flex-1">
          <div
            className="flex whitespace-nowrap"
            style={{ animation: "tickerScroll 40s linear infinite" }}
          >
            {items.map((m, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-6 py-1.5 border-r border-white/[0.06]"
              >
                <span
                  className="text-[11px]"
                  style={{ color: getSportAccent(m.sport) }}
                >
                  {SPORT_CONFIG[m.sport as keyof typeof SPORT_CONFIG]?.emoji}
                </span>
                <span className="text-white/70 text-xs">{m.homeTeam}</span>
                <span
                  className="text-white text-[13px] font-bold tracking-wide"
                  style={{
                    fontFamily: "'SF Mono','Fira Code',monospace",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {m.homeScore} – {m.awayScore}
                </span>
                <span className="text-white/70 text-xs">{m.awayTeam}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}