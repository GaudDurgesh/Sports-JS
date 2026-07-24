import { Link } from "react-router-dom";
import type { Match } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import TeamLogo from "@/components/ui/TeamLogo";
import { formatCricketScore, getTeamAbbr } from "@/utils/cricketUtils";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function bottomLine(match: Match): string {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  if (match.sport === "cricket") {
    if (isLive) {
      const ov = match.metadata?.currentOvers;
      return ov != null ? `${ov} Ov` : "Live";
    }
    if (isFinished) return "Full time";
    return formatDate(match.startTime);
  }
  if (isLive) {
    const m = match.metadata?.minute;
    return m != null ? `${m}'` : "Live";
  }
  if (isFinished) return "Full time";
  return formatDate(match.startTime);
}

export default function MatchCard({ match }: { match: Match }) {
  const isCricket = match.sport === "cricket";
  const accent = isCricket ? "var(--accent-cricket)" : "var(--accent-football)";
  const isLive = match.status === "live";
  const isScheduled = match.status === "scheduled";

  const homeFlag = isCricket ? match.metadata?.homeTeamFlag : null;
  const awayFlag = isCricket ? match.metadata?.awayTeamFlag : null;
  const homeCrest = !isCricket ? match.metadata?.homeTeamCrest : null;
  const awayCrest = !isCricket ? match.metadata?.awayTeamCrest : null;

  let scoreNode: React.ReactNode;
  if (isScheduled) {
    scoreNode = <span className="text-xs text-[var(--text-secondary)]">vs</span>;
  } else if (isCricket) {
    scoreNode = (
      <span className="text-[22px] font-bold tabular-nums leading-none">
        {formatCricketScore(match.homeScore, match.homeWickets)}
        <span className="mx-1 text-[var(--text-secondary)]">-</span>
        {formatCricketScore(match.awayScore, match.awayWickets)}
      </span>
    );
  } else {
    scoreNode = (
      <span className="text-[22px] font-bold tabular-nums leading-none">
        {match.homeScore ?? 0}
        <span className="mx-1 text-[var(--text-secondary)]">-</span>
        {match.awayScore ?? 0}
      </span>
    );
  }

  return (
    <Link
      to={`/match/${match.id}`}
      className="group block w-[280px] min-w-[280px] shrink-0 scroll-ml-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-colors hover:bg-[var(--bg-elevated)]"
      style={{ borderLeft: `3px solid ${accent}`, scrollSnapAlign: "start" }}
    >
      <div className="flex items-center justify-between">
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
          style={{ background: accent }}
        >
          {match.sport}
        </span>
        {isLive ? (
          <StatusBadge status="live" />
        ) : (
          <span className="truncate text-[10px] font-medium text-[var(--text-secondary)]">
            {match.metadata?.competitionName ?? ""}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 py-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <TeamLogo
            size="sm"
            name={match.homeTeam}
            flagUrl={homeFlag}
            crestUrl={homeCrest}
          />
          <span className="truncate text-xs text-[var(--text-secondary)]">
            {getTeamAbbr(match.homeTeam).slice(0, 8)}
          </span>
        </div>
        <div className="flex items-center justify-center px-1 text-center">
          {scoreNode}
        </div>
        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <span className="truncate text-xs text-[var(--text-secondary)]">
            {getTeamAbbr(match.awayTeam).slice(0, 8)}
          </span>
          <TeamLogo
            size="sm"
            name={match.awayTeam}
            flagUrl={awayFlag}
            crestUrl={awayCrest}
          />
        </div>
      </div>

      <div className="text-[10px] text-[var(--text-secondary)]">
        {bottomLine(match)}
      </div>
    </Link>
  );
}
