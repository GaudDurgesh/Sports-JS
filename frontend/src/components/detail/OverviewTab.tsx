import type { Match } from "@/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatMatchStatus, formatMatchType, getTeamAbbr } from "@/utils/cricketUtils";

export default function OverviewTab({ match }: { match: Match }) {
  const md = match.metadata ?? {};
  const innings = md.innings ?? [];
  const recentBalls = md.recentBalls ?? [];
  const isCricket = match.sport === "cricket";

  const homeAbbr = getTeamAbbr(match.homeTeam);
  const awayAbbr = getTeamAbbr(match.awayTeam);

  // Cricket chart: one row per innings, split runs into home/away by index parity.
  const cricketChartData = innings.map((i, idx) => {
    const isHome = idx % 2 === 0;
    return {
      name: `Inn ${idx + 1}`,
      [homeAbbr]: isHome ? i.runs : null,
      [awayAbbr]: !isHome ? i.runs : null,
    } as Record<string, number | string | null>;
  });

  const footballChartData = [
    { name: "1H", runs: match.homeScore ?? 0 },
    { name: "2H", runs: match.awayScore ?? 0 },
  ];

  const showAway = isCricket && innings.length >= 2;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <h3 className="mb-3 text-sm font-semibold">Match Info</h3>
        <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-xs">
          <dt className="text-[var(--text-secondary)]">Date</dt>
          <dd>{new Date(match.startTime).toLocaleString()}</dd>
          {md.series && (
            <>
              <dt className="text-[var(--text-secondary)]">Series</dt>
              <dd>{md.series}</dd>
            </>
          )}
          {md.venue && (
            <>
              <dt className="text-[var(--text-secondary)]">Venue</dt>
              <dd>{md.venue}</dd>
            </>
          )}
          {md.toss && (
            <>
              <dt className="text-[var(--text-secondary)]">Toss</dt>
              <dd>{md.toss}</dd>
            </>
          )}
          {md.matchType && (
            <>
              <dt className="text-[var(--text-secondary)]">Format</dt>
              <dd>{formatMatchType(md.matchType)}</dd>
            </>
          )}
          <dt className="text-[var(--text-secondary)]">Status</dt>
          <dd className="capitalize">{formatMatchStatus(match)}</dd>
        </dl>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <h3 className="mb-3 text-sm font-semibold">Live Match Overview</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={isCricket ? cricketChartData : footballChartData}>
              <defs>
                <linearGradient id="gradHome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-cricket)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--accent-cricket)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAway" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-football)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--accent-football)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} />
              <YAxis stroke="var(--text-secondary)" fontSize={10} />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              {isCricket && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {isCricket ? (
                <>
                  <Area
                    type="monotone"
                    dataKey={homeAbbr}
                    stroke="var(--accent-cricket)"
                    fill="url(#gradHome)"
                    strokeWidth={2}
                    connectNulls
                  />
                  {showAway && (
                    <Area
                      type="monotone"
                      dataKey={awayAbbr}
                      stroke="var(--accent-football)"
                      fill="url(#gradAway)"
                      strokeWidth={2}
                      connectNulls
                    />
                  )}
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="runs"
                  stroke="var(--accent-football)"
                  fill="url(#gradAway)"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {recentBalls.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
              Recent Balls
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentBalls.map((b, i) => (
                <span
                  key={i}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[10px] font-semibold"
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
