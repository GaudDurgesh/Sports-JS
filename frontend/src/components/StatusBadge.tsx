// src/components/StatusBadge.tsx
// Reusable status badge used in both Home MatchCard and ScoreHeader.

import type { Match } from "../types";

interface Props {
  status: Match["status"];
  /**
   * 'compact' (default) — small pill, used on cards
   * 'full'    — larger pill with border, used in ScoreHeader
   */
  variant?: "compact" | "full";
}

export function StatusBadge({ status, variant = "compact" }: Props) {
  if (variant === "full") {
    // ScoreHeader style
    if (status === "live") {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 999,
            padding: "5px 12px",
          }}
        >
          <span className="sh-pulse-dot" />
          <span
            style={{
              color: "#F59E0B",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            LIVE
          </span>
        </div>
      );
    }
    if (status === "finished") {
      return (
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 999,
            padding: "5px 12px",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            FULL TIME
          </span>
        </div>
      );
    }
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          borderRadius: 999,
          padding: "5px 12px",
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
          }}
        >
          UPCOMING
        </span>
      </div>
    );
  }

  // compact style (card default)
  if (status === "live") {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"
          style={{ animation: "tickerPulse 1.4s ease-in-out infinite" }}
        />
        <span className="text-amber-400 text-[11px] font-bold tracking-widest">
          LIVE
        </span>
      </div>
    );
  }
  if (status === "finished") {
    return (
      <span className="text-white/30 text-[11px] font-semibold tracking-widest">
        FT
      </span>
    );
  }
  return (
    <span className="text-white/35 text-[11px] font-semibold tracking-widest">
      SOON
    </span>
  );
}