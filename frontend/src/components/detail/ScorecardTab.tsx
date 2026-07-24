import type { Match } from "@/types";
import EmptyState from "@/components/ui/EmptyState";
import { Info } from "lucide-react";

export default function ScorecardTab({ match }: { match: Match }) {
  if (match.sport !== "cricket") {
    return (
      <EmptyState icon={Info} title="Not available for football" />
    );
  }
  const scorecard = match.metadata?.scorecard;
  const innings = match.metadata?.innings ?? [];

  if (scorecard && scorecard.length > 0) {
    return (
      <div className="space-y-6">
        {scorecard.map((inn, idx) => (
          <div key={idx} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <h3 className="mb-3 text-sm font-semibold">{inn.label}</h3>
            {inn.batting && inn.batting.length > 0 && (
              <table className="mb-4 w-full text-xs">
                <thead>
                  <tr className="bg-[var(--accent-cricket)]/20 text-left">
                    <th className="p-2">Player</th>
                    <th className="p-2 text-right">R</th>
                    <th className="p-2 text-right">B</th>
                    <th className="p-2 text-right">4s</th>
                    <th className="p-2 text-right">6s</th>
                    <th className="p-2 text-right">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {inn.batting.map((row, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? "bg-[var(--bg-card)]" : "bg-[var(--bg-elevated)]"}
                    >
                      <td className="p-2">{row.player}</td>
                      <td className="p-2 text-right tabular-nums">{row.runs}</td>
                      <td className="p-2 text-right tabular-nums">{row.balls}</td>
                      <td className="p-2 text-right tabular-nums">{row.fours}</td>
                      <td className="p-2 text-right tabular-nums">{row.sixes}</td>
                      <td className="p-2 text-right tabular-nums">{row.strikeRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {inn.bowling && inn.bowling.length > 0 && (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--accent-cricket)]/20 text-left">
                    <th className="p-2">Bowler</th>
                    <th className="p-2 text-right">O</th>
                    <th className="p-2 text-right">M</th>
                    <th className="p-2 text-right">R</th>
                    <th className="p-2 text-right">W</th>
                    <th className="p-2 text-right">ER</th>
                  </tr>
                </thead>
                <tbody>
                  {inn.bowling.map((row, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? "bg-[var(--bg-card)]" : "bg-[var(--bg-elevated)]"}
                    >
                      <td className="p-2">{row.bowler}</td>
                      <td className="p-2 text-right tabular-nums">{row.overs}</td>
                      <td className="p-2 text-right tabular-nums">{row.maidens}</td>
                      <td className="p-2 text-right tabular-nums">{row.runs}</td>
                      <td className="p-2 text-right tabular-nums">{row.wickets}</td>
                      <td className="p-2 text-right tabular-nums">{row.economy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (innings.length === 0) {
    return <EmptyState title="No scorecard data yet" />;
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[var(--accent-cricket)]/20 text-left">
            <th className="p-2">Innings</th>
            <th className="p-2 text-right">Runs</th>
            <th className="p-2 text-right">Wickets</th>
            <th className="p-2 text-right">Overs</th>
          </tr>
        </thead>
        <tbody>
          {innings.map((inn, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-[var(--bg-card)]" : "bg-[var(--bg-elevated)]"}
            >
              <td className="p-2">{inn.label}</td>
              <td className="p-2 text-right tabular-nums">{inn.runs}</td>
              <td className="p-2 text-right tabular-nums">{inn.wickets}</td>
              <td className="p-2 text-right tabular-nums">{inn.overs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
