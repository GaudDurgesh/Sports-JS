import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import type { Match } from "@/types";
import type { CricketInnings } from "@/api/scorecards";
import { getCricketScorecard } from "@/api/scorecards";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";

/** Renders a value verbatim, or an em dash when the provider gave nothing.
 *  Zero is a real value and is always shown. */
function val(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

const cellClass = "whitespace-nowrap px-2 py-1.5 text-right tabular-nums";
const headClass = "whitespace-nowrap px-2 py-1.5 text-right font-medium";

function TableShell({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[520px] text-xs">
        <caption className="mb-2 text-left text-xs font-semibold text-[var(--text-secondary)]">
          {caption}
        </caption>
        {children}
      </table>
    </div>
  );
}

function MissingSection({ label }: { label: string }) {
  return <p className="text-xs text-[var(--text-secondary)]">{label} unavailable</p>;
}

function EmptySection({ label }: { label: string }) {
  return <p className="text-xs text-[var(--text-secondary)]">No {label}</p>;
}

function Section({
  label,
  rows,
  children,
}: {
  label: string;
  rows: unknown[] | null;
  children: React.ReactNode;
}) {
  if (rows === null) return <MissingSection label={label} />;
  if (rows.length === 0) return <EmptySection label={label.toLowerCase()} />;
  return <>{children}</>;
}

function InningsBlock({ innings }: { innings: CricketInnings }) {
  const {
    teamName,
    teamShortName,
    runs,
    wickets,
    overs,
    declared,
    followOn,
    batting,
    bowling,
    extras,
    fallOfWickets,
    partnerships,
  } = innings;

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold">
          {teamName}
          {teamShortName ? (
            <span className="ml-1 text-[var(--text-secondary)]">({teamShortName})</span>
          ) : null}
        </h3>
        <span className="text-sm font-semibold tabular-nums text-[var(--accent-cricket)]">
          {runs}/{wickets}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {overs === null ? "Overs unavailable" : `${overs} overs`}
        </span>
        {declared ? (
          <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] uppercase tracking-wide">
            Declared
          </span>
        ) : null}
        {followOn ? (
          <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] uppercase tracking-wide">
            Follow on
          </span>
        ) : null}
      </header>

      <Section label="Batting" rows={batting}>
        <TableShell caption="Batting">
          <thead>
            <tr className="bg-[var(--accent-cricket)]/20">
              <th className="px-2 py-1.5 text-left font-medium">Batter</th>
              <th className="px-2 py-1.5 text-left font-medium">Dismissal</th>
              <th className={headClass}>R</th>
              <th className={headClass}>B</th>
              <th className={headClass}>4s</th>
              <th className={headClass}>6s</th>
              <th className={headClass}>SR</th>
            </tr>
          </thead>
          <tbody>
            {(batting ?? []).map((row, i) => (
              <tr
                key={`${row.playerId}-${i}`}
                className={i % 2 === 0 ? "bg-[var(--bg-card)]" : "bg-[var(--bg-elevated)]"}
              >
                <td className="px-2 py-1.5 text-left">{row.name}</td>
                <td className="px-2 py-1.5 text-left text-[var(--text-secondary)]">
                  {val(row.dismissal)}
                </td>
                <td className={cellClass}>{val(row.runs)}</td>
                <td className={cellClass}>{val(row.balls)}</td>
                <td className={cellClass}>{val(row.fours)}</td>
                <td className={cellClass}>{val(row.sixes)}</td>
                <td className={cellClass}>{val(row.strikeRate)}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Section>

      <Section label="Bowling" rows={bowling}>
        <TableShell caption="Bowling">
          <thead>
            <tr className="bg-[var(--accent-cricket)]/20">
              <th className="px-2 py-1.5 text-left font-medium">Bowler</th>
              <th className={headClass}>O</th>
              <th className={headClass}>M</th>
              <th className={headClass}>R</th>
              <th className={headClass}>W</th>
              <th className={headClass}>Econ</th>
            </tr>
          </thead>
          <tbody>
            {(bowling ?? []).map((row, i) => (
              <tr
                key={`${row.playerId}-${i}`}
                className={i % 2 === 0 ? "bg-[var(--bg-card)]" : "bg-[var(--bg-elevated)]"}
              >
                <td className="px-2 py-1.5 text-left">{row.name}</td>
                <td className={cellClass}>{val(row.overs)}</td>
                <td className={cellClass}>{val(row.maidens)}</td>
                <td className={cellClass}>{val(row.runs)}</td>
                <td className={cellClass}>{val(row.wickets)}</td>
                <td className={cellClass}>{val(row.economy)}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Section>

      {extras === null ? (
        <MissingSection label="Extras" />
      ) : (
        <div className="rounded-xl bg-[var(--bg-elevated)] p-3 text-xs">
          <span className="font-semibold">Extras {val(extras.total)}</span>
          <span className="ml-2 text-[var(--text-secondary)]">
            b {val(extras.byes)}, lb {val(extras.legByes)}, w {val(extras.wides)}, nb{" "}
            {val(extras.noBalls)}, p {val(extras.penalty)}
          </span>
        </div>
      )}

      <Section label="Fall of wickets" rows={fallOfWickets}>
        <TableShell caption="Fall of wickets">
          <thead>
            <tr className="bg-[var(--accent-cricket)]/20">
              <th className="px-2 py-1.5 text-left font-medium">Batter</th>
              <th className={headClass}>Team runs</th>
              <th className={headClass}>Delivery</th>
            </tr>
          </thead>
          <tbody>
            {(fallOfWickets ?? []).map((row, i) => (
              <tr
                key={`${row.playerId}-${i}`}
                className={i % 2 === 0 ? "bg-[var(--bg-card)]" : "bg-[var(--bg-elevated)]"}
              >
                <td className="px-2 py-1.5 text-left">{row.name}</td>
                <td className={cellClass}>{val(row.teamRuns)}</td>
                <td className={cellClass}>{val(row.delivery)}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Section>

      <Section label="Partnerships" rows={partnerships}>
        <TableShell caption="Partnerships">
          <thead>
            <tr className="bg-[var(--accent-cricket)]/20">
              <th className="px-2 py-1.5 text-left font-medium">Batter 1</th>
              <th className={headClass}>R (B)</th>
              <th className="px-2 py-1.5 text-left font-medium">Batter 2</th>
              <th className={headClass}>R (B)</th>
              <th className={headClass}>Partnership</th>
            </tr>
          </thead>
          <tbody>
            {(partnerships ?? []).map((row, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? "bg-[var(--bg-card)]" : "bg-[var(--bg-elevated)]"}
              >
                <td className="px-2 py-1.5 text-left">{row.batters[0].name}</td>
                <td className={cellClass}>
                  {val(row.batters[0].runs)} ({val(row.batters[0].balls)})
                </td>
                <td className="px-2 py-1.5 text-left">{row.batters[1].name}</td>
                <td className={cellClass}>
                  {val(row.batters[1].runs)} ({val(row.batters[1].balls)})
                </td>
                <td className={cellClass}>
                  {val(row.runs)} ({val(row.balls)})
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Section>
    </section>
  );
}

function SummaryFallback({ match }: { match: Match }) {
  const innings = match.metadata?.innings ?? [];
  if (innings.length === 0) {
    return (
      <EmptyState
        title="No detailed scorecard saved yet"
        subtitle="Detailed batting and bowling statistics have not been saved for this match."
      />
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--text-secondary)]">
        No detailed scorecard saved yet — showing the innings summary.
      </p>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <TableShell caption="Innings summary">
          <thead>
            <tr className="bg-[var(--accent-cricket)]/20">
              <th className="px-2 py-1.5 text-left font-medium">Innings</th>
              <th className={headClass}>Runs</th>
              <th className={headClass}>Wickets</th>
              <th className={headClass}>Overs</th>
            </tr>
          </thead>
          <tbody>
            {innings.map((inn, i) => (
              <tr
                key={i}
                className={i % 2 === 0 ? "bg-[var(--bg-card)]" : "bg-[var(--bg-elevated)]"}
              >
                <td className="px-2 py-1.5 text-left">{inn.label}</td>
                <td className={cellClass}>{val(inn.runs)}</td>
                <td className={cellClass}>{val(inn.wickets)}</td>
                <td className={cellClass}>{val(inn.overs)}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </div>
    </div>
  );
}

export default function ScorecardTab({ match }: { match: Match }) {
  const isCricket = match.sport === "cricket";

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["cricket-scorecard", String(match.id)],
    queryFn: () => getCricketScorecard(String(match.id)),
    enabled: isCricket && !!match.id,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  if (!isCricket) {
    return <EmptyState icon={Info} title="Not available for football" />;
  }

  if (isPending) {
    return (
      <div className="space-y-3" data-testid="scorecard-loading">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message="Could not load the scorecard." onRetry={() => refetch()} />;
  }

  if (!data || data.meta.availability === "unsupported") {
    return <EmptyState icon={Info} title="Scorecard not available" />;
  }

  if (data.data === null) {
    return <SummaryFallback match={match} />;
  }

  const { complete, result, innings } = data.data;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[var(--accent-cricket)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-cricket)]">
            Saved scorecard
          </span>
          {!complete && (
            <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">
              Incomplete
            </span>
          )}
        </div>
        <p className="mt-2 text-sm">{val(result)}</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Saved snapshot, not live. Saved to the database at{" "}
          {new Date(data.meta.savedAt).toLocaleString()} · source {data.meta.provider}
        </p>
      </div>

      {innings.map((inn) => (
        <InningsBlock key={inn.id} innings={inn} />
      ))}
    </div>
  );
}
