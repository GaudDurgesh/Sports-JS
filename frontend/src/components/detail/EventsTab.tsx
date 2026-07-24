import { useQuery } from "@tanstack/react-query";
import { getMatchEvents } from "@/api/matches";
import type { Match } from "@/types";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";

function iconFor(type: string) {
  if (type === "goal") return "⚽";
  if (type === "yellow_card") return "🟨";
  if (type === "red_card") return "🟥";
  if (type === "substitution") return "🔄";
  return "•";
}

export default function EventsTab({ match }: { match: Match }) {
  if (match.sport !== "football") {
    return <EmptyState icon={Info} title="Not available for cricket" />;
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ["match-events", match.id],
    queryFn: () => getMatchEvents(match.id),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (isError) return <EmptyState title="Couldn't load events" />;
  if (!data || data.length === 0)
    return <EmptyState title="No events yet" />;

  return (
    <ol className="space-y-2">
      {data.map((ev) => (
        <li
          key={ev.id}
          className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-xs font-semibold tabular-nums">
            {ev.minute}'
          </div>
          <div className="text-lg">{iconFor(ev.type)}</div>
          <div className="flex-1">
            <div className="text-sm font-semibold">{ev.actor}</div>
            {ev.message && (
              <div className="text-xs text-[var(--text-secondary)]">{ev.message}</div>
            )}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">
            {ev.team === "home" ? match.homeTeam : ev.team === "away" ? match.awayTeam : ev.team}
          </div>
        </li>
      ))}
    </ol>
  );
}
