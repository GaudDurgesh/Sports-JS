import type { Match, CricketInnings } from "../types";
import { resolveTeamName } from "../utils/cricketUtils";

interface CricketMeta {
  matchType?: string | null;
  venue?: string | null;
  innings?: CricketInnings[];
}

interface Props {
  match: Match;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

// ─── Single innings row ───────────────────────────────────────────────────────

interface InningsRowProps {
  inn: CricketInnings & { teamId?: number | string };
  index: number;
  match: Match;
  isLive: boolean;
  isBatting: boolean;
  // How many times this specific team has batted up to and including this row
  // (computed by the parent, label-aware — not a simple index/2 heuristic)
  teamInningsNumber: number;
}

function InningsRow({
  inn,
  index,
  match,
  isLive,
  isBatting,
  teamInningsNumber,
}: InningsRowProps) {
  const teamName = resolveTeamName(inn, index, match);
  const isHomeInnings = teamName === match.homeTeam;
  const inningsLabel = `${ordinal(teamInningsNumber)} innings`;

  const allOut = inn.wickets === 10;
  const notOut = inn.wickets === null;

  return (
    <div
      className={`
        flex items-center justify-between
        px-4 py-3.5 rounded-xl
        border border-white/[0.06]
        ${isHomeInnings ? "bg-white/[0.04]" : "bg-white/[0.02]"}
      `}
    >
      {/* Left: team name + sub-info */}
      <div className="min-w-0 flex-1">
        <div className="text-slate-100 text-sm font-semibold mb-0.5 truncate">
          {teamName}
        </div>
        <div className="flex items-center gap-1.5 text-white/30 text-[11px]">
          <span>{inningsLabel}</span>
          {inn.overs !== null && (
            <>
              <span className="text-white/15">·</span>
              <span>{inn.overs} ov</span>
            </>
          )}
          {allOut && (
            <>
              <span className="text-white/15">·</span>
              <span>all out</span>
            </>
          )}
          {isLive && isBatting && !allOut && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-amber-400 font-semibold">batting</span>
            </>
          )}
        </div>
      </div>

      {/* Right: score */}
      <div className="flex items-baseline gap-0.5 flex-shrink-0 ml-4 text-right">
        <span className="text-[28px] font-bold font-mono tabular-nums text-gray-50 leading-none">
          {inn.runs}
        </span>
        {!allOut && !notOut && (
          <span className="text-base font-semibold font-mono text-white/35">
            /{inn.wickets}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CricketScorecard({ match }: Props) {
  const meta = match.metadata as CricketMeta | null;
  const innings = meta?.innings ?? [];
  const matchType = meta?.matchType?.toUpperCase() ?? null;
  const venue = meta?.venue ?? null;
  const isLive = match.status === "live";

  // The last innings in the array is the one currently being batted
  const liveInningsIndex = isLive ? innings.length - 1 : -1;

  if (innings.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-6 py-8 text-center text-white/25 text-sm">
        {match.status === "scheduled"
          ? "Match has not started yet"
          : "Scorecard not available yet"}
      </div>
    );
  }

  // Pre-compute per-team innings counter using resolveTeamName (cricketUtils).
  // resolveTeamName priority: exact label prefix → unique-word fuzzy → index parity.
  // This correctly handles both new Cricbuzz data and legacy CricAPI rows in the DB.
  const teamCounts: Record<string, number> = {};
  const inningsWithCount = innings.map((inn, i) => {
    const teamName = resolveTeamName(inn, i, match);
    teamCounts[teamName] = (teamCounts[teamName] ?? 0) + 1;
    return { inn, index: i, teamName, teamInningsNumber: teamCounts[teamName] };
  });

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-sm">🏏</span>
          <span className="text-white/70 text-[11px] font-bold tracking-[0.12em] uppercase">
            Scorecard
          </span>
        </div>
        {matchType && (
          <span className="bg-teal-500/10 border border-teal-500/25 text-teal-400 text-[10px] font-bold px-2 py-0.5 rounded-md tracking-[0.08em]">
            {matchType}
          </span>
        )}
      </div>

      {/* Innings rows */}
      <div className="p-3 flex flex-col gap-2">
        {inningsWithCount.map(({ inn, index, teamInningsNumber }) => (
          <InningsRow
            key={index}
            inn={inn}
            index={index}
            match={match}
            isLive={isLive}
            isBatting={index === liveInningsIndex}
            teamInningsNumber={teamInningsNumber}
          />
        ))}
      </div>

      {/* Venue footer */}
      {venue && (
        <div className="border-t border-white/[0.06] px-4 py-2.5 flex items-center gap-1.5">
          <span className="text-xs">📍</span>
          <span className="text-white/30 text-xs">{venue}</span>
        </div>
      )}
    </div>
  );
}
