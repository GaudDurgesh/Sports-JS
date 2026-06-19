// src/components/MatchCard.tsx
// Self-contained card shown in the Home grid.

import { useNavigate } from "react-router-dom";
import { resolveTeamName } from "../utils/cricketUtils";
import { StatusBadge } from "./StatusBadge";
import type { Match } from "../types";

// ─── Sport config (local — card only needs emoji + accent) ───────────────────
const SPORT_CONFIG = {
  cricket:  { emoji: "🏏", accent: "#14B8A6", label: "Cricket" },
  football: { emoji: "⚽", accent: "#3B82F6", label: "Football" },
} as const;

function getSportAccent(sport: string) {
  return SPORT_CONFIG[sport as keyof typeof SPORT_CONFIG]?.accent ?? "#6B7280";
}

interface Props {
  match: Match;
  /** id of the match that just received a score update — triggers flash */
  flashId: number | null;
}

export function MatchCard({ match, flashId }: Props) {
  const navigate = useNavigate();
  const isFlashing = flashId === match.id;
  const accent = getSportAccent(match.sport);
  const cfg = SPORT_CONFIG[match.sport as keyof typeof SPORT_CONFIG];
  const isLive = match.status === "live";
  const isCricket = match.sport === "cricket";

  const innings = (match.metadata as any)?.innings ?? [];
  const hasInnings = isCricket && innings.length > 0;
  const liveInningsIndex = isLive && hasInnings ? innings.length - 1 : -1;

  return (
    <div
      onClick={() => navigate(`/match/${match.id}`)}
      className="rounded-2xl cursor-pointer transition-all duration-250 relative overflow-hidden"
      style={{
        background: isFlashing
          ? "rgba(245,158,11,0.08)"
          : isLive
            ? "rgba(255,255,255,0.05)"
            : "rgba(255,255,255,0.03)",
        border: `1px solid ${isFlashing ? "rgba(245,158,11,0.4)" : isLive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
        borderTop: `3px solid ${isLive ? accent : "rgba(255,255,255,0.06)"}`,
        padding: "18px 20px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = isLive
          ? accent + "80"
          : "rgba(255,255,255,0.14)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = isFlashing
          ? "rgba(245,158,11,0.4)"
          : isLive
            ? "rgba(255,255,255,0.1)"
            : "rgba(255,255,255,0.06)";
      }}
    >
      {/* Sport + status row */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{cfg?.emoji ?? "🏅"}</span>
          <span
            className="text-[11px] font-semibold tracking-widest uppercase"
            style={{ color: accent }}
          >
            {cfg?.label ?? match.sport}
          </span>
        </div>
        <StatusBadge status={match.status} />
      </div>

      {/* ── Cricket: stacked innings layout ── */}
      {hasInnings ? (
        <div className="flex flex-col gap-2 mb-4">
          {innings.map((inn: any, i: number) => {
            const teamName = resolveTeamName(inn, i, match);
            const allOut = inn.wickets === 10;
            const scoreStr =
              inn.wickets !== null && !allOut
                ? `${inn.runs}/${inn.wickets}`
                : String(inn.runs);
            const isBatting = isLive && i === liveInningsIndex;

            return (
              <div
                key={i}
                className="flex justify-between items-center px-3 py-2 rounded-lg border border-white/[0.05] bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-white/80 text-[12px] font-medium truncate max-w-[130px]">
                    {teamName}
                  </div>
                  {inn.overs !== null && (
                    <div className="text-white/30 text-[10px] mt-0.5 flex items-center gap-1">
                      <span>{inn.overs} ov</span>
                      {allOut && (
                        <>
                          <span className="text-white/15">·</span>
                          <span>all out</span>
                        </>
                      )}
                      {isBatting && !allOut && (
                        <>
                          <span className="text-white/15">·</span>
                          <span className="text-amber-400 font-semibold">
                            batting
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div
                  className="font-mono tabular-nums text-lg font-bold flex-shrink-0 ml-3"
                  style={{ color: isLive ? "#F9FAFB" : "rgba(255,255,255,0.7)" }}
                >
                  {scoreStr}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Football / no metadata: side-by-side layout ── */
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-4">
          <div>
            <div className="text-white/90 text-[13px] font-medium mb-1 truncate">
              {match.homeTeam}
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                lineHeight: 1,
                color: isLive ? "#F9FAFB" : "rgba(255,255,255,0.5)",
                fontFamily: "'SF Mono','Fira Code',monospace",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {match.homeScore}
            </div>
          </div>
          <div className="text-white/15 text-lg font-light text-center select-none">
            vs
          </div>
          <div className="text-right">
            <div className="text-white/90 text-[13px] font-medium mb-1 truncate">
              {match.awayTeam}
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                lineHeight: 1,
                color: isLive ? "#F9FAFB" : "rgba(255,255,255,0.5)",
                fontFamily: "'SF Mono','Fira Code',monospace",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {match.awayScore}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-white/[0.06] pt-3 flex justify-between items-center">
        <span className="text-white/30 text-[11px]">
          {new Date(match.startTime).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            timeZone: "Asia/Kolkata", // ✅ explicit IST so it matches real time
          })}
        </span>
        <span className="text-white/25 text-[11px]">View details →</span>
      </div>
    </div>
  );
}