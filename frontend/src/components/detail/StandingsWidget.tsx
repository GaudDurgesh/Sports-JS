import { useQuery } from "@tanstack/react-query";
import { getStandings } from "@/api/standings";
import type { Match } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function StandingsWidget({ match }: { match: Match }) {
  const code = match.metadata?.competitionCode;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["standings", code],
    queryFn: () => getStandings(code!),
    enabled: !!code,
    retry: false,
  });

  if (!code) return null;
  if (isError) return null;

  const table = data?.data?.standings?.[0]?.table ?? [];
  if (!isLoading && table.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-sm font-semibold">Standings</div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
          {match.metadata?.competitionName ?? code}
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : (
        <>
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-[var(--text-secondary)]">
              <tr>
                <th className="w-6 text-left font-medium">#</th>
                <th className="text-left font-medium">Team</th>
                <th className="w-8 text-right font-medium">P</th>
                <th className="w-8 text-right font-medium">Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.slice(0, 8).map((row) => (
                <tr
                  key={row.position}
                  className={
                    row.position === 1
                      ? "border-l-2 border-[var(--accent-cricket)] bg-[var(--accent-cricket)]/10"
                      : ""
                  }
                >
                  <td className="py-1.5">{row.position}</td>
                  <td className="truncate py-1.5">{row.team?.name}</td>
                  <td className="py-1.5 text-right tabular-nums">{row.playedGames}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="mt-2 w-full text-center text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            View Full Table
          </button>
        </>
      )}
    </div>
  );
}
