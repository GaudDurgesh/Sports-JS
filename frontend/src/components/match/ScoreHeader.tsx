import type { Match } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import TeamLogo from "@/components/ui/TeamLogo";
import { formatCricketScore, formatMatchStatus } from "@/utils/cricketUtils";

function CricketHeader({ match }: { match: Match }) {
  const isLive = match.status === "live";
  const md = match.metadata ?? {};
  const seriesLabel = md.series ?? md.competitionName;
  const awayInningsExists = (match.metadata?.innings ?? []).some((i) =>
    i.label?.startsWith(match.awayTeam),
  );

  const awayYetToBat =
    (match.awayScore == null || match.awayScore === 0) &&
    match.awayWickets == null &&
    !awayInningsExists;

  const awayScoreText = awayYetToBat
    ? "Yet to bat"
    : formatCricketScore(match.awayScore, match.awayWickets);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      {seriesLabel && (
        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--accent-cricket)]">
          {seriesLabel}
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-3">
          <TeamLogo size="lg" name={match.homeTeam} flagUrl={md.homeTeamFlag} />
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{match.homeTeam}</div>
            <div className="text-[36px] font-black leading-none tabular-nums">
              {formatCricketScore(match.homeScore, match.homeWickets)}
            </div>
            <div className="mt-1 text-xs text-[var(--text-secondary)]">
              {md.currentOvers ?? "—"} Ov
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {isLive ? (
            <StatusBadge status="live" />
          ) : (
            <div className="text-lg font-bold text-[var(--text-secondary)]">vs</div>
          )}
          <div className="text-xs text-[var(--text-secondary)]">
            {match.status === "finished"
              ? "Full time"
              : awayYetToBat
                ? "Yet to bat"
                : formatMatchStatus(match)}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 text-right">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{match.awayTeam}</div>
            <div className="text-[36px] font-black leading-none tabular-nums">{awayScoreText}</div>
          </div>
          <TeamLogo size="lg" name={match.awayTeam} flagUrl={md.awayTeamFlag} />
        </div>
      </div>

      {md.toss && <div className="mt-4 text-xs italic text-[var(--text-secondary)]">{md.toss}</div>}
    </div>
  );
}

function FootballHeader({ match }: { match: Match }) {
  const isLive = match.status === "live";
  const md = match.metadata ?? {};
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-football)]">
          {md.competitionName ?? match.sport}
          {md.matchday && (
            <span className="ml-2 text-[var(--text-secondary)]">· Matchday {md.matchday}</span>
          )}
        </div>
        <StatusBadge status={isLive ? "live" : match.status} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-3">
          <TeamLogo size="lg" name={match.homeTeam} crestUrl={md.homeTeamCrest} />
          <div className="text-lg font-bold">{match.homeTeam}</div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-4xl font-black tabular-nums">
            {match.homeScore ?? 0}
            <span className="mx-3 text-[var(--text-secondary)]">-</span>
            {match.awayScore ?? 0}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            {formatMatchStatus(match)}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <div className="text-right text-lg font-bold">{match.awayTeam}</div>
          <TeamLogo size="lg" name={match.awayTeam} crestUrl={md.awayTeamCrest} />
        </div>
      </div>
    </div>
  );
}

export default function ScoreHeader({ match }: { match: Match }) {
  return match.sport === "cricket" ? (
    <CricketHeader match={match} />
  ) : (
    <FootballHeader match={match} />
  );
}
