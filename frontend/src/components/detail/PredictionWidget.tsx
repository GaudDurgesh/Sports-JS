import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { Match } from "@/types";

export default function PredictionWidget({ match }: { match: Match }) {
  const home = match.homeScore ?? 0;
  const away = match.awayScore ?? 0;
  let homePct = 50;
  if (home + away > 0) {
    homePct = Math.round((home / (home + away)) * 100);
  }
  const awayPct = 100 - homePct;
  const data = [
    { name: "home", value: homePct },
    { name: "away", value: awayPct },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="mb-2 text-sm font-semibold">Match Prediction</div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={38}
              outerRadius={58}
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              <Cell fill="var(--accent-cricket)" />
              <Cell fill="var(--accent-football)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div>
          <div className="truncate font-semibold">{match.homeTeam}</div>
          <div className="text-[var(--accent-cricket)]">{homePct}%</div>
        </div>
        <div className="text-right">
          <div className="truncate font-semibold">{match.awayTeam}</div>
          <div className="text-[var(--accent-football)]">{awayPct}%</div>
        </div>
      </div>
      <div className="mt-2 text-center text-[10px] italic text-[var(--text-secondary)]">
        Estimated — not a trained model
      </div>
    </div>
  );
}
