import { useQuery } from "@tanstack/react-query";
import { getMatchEvents } from "@/api/matches";
import type { FootballEvent, Match } from "@/types";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";

function iconFor(type: string) {
  if (type === "goal") return "⚽";
  if (type === "yellow_card") return "🟨";
  if (type === "red_card") return "🟥";
  if (type === "substitution") return "🔄";
  if (type === "booking") return "📋";
  return "•";
}

function formatMinute(ev: FootballEvent) {
  if (ev.minute === null || ev.minute === undefined) return "—";
  const added = ev.metadata?.addedTime;
  if (typeof added === "number" && added > 0) return `${ev.minute}+${added}'`;
  return `${ev.minute}'`;
}

function teamLabel(ev: FootballEvent, match: Match) {
  if (ev.team === "home") return match.homeTeam;
  if (ev.team === "away") return match.awayTeam;
  return ev.team;
}

export default function EventsTab({ match }: { match: Match }) {
  const isFootball = match.sport === "football";

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["match-events", match.id],
    queryFn: () => getMatchEvents(match.id),
    enabled: isFootball && !!match.id,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 429 || status === 503) return false;
      return failureCount < 2;
    },
  });

  if (!isFootball) {
    return <EmptyState icon={Info} title="Not available for cricket" />;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <ErrorState
        message="Couldn't load events."
        onRetry={() => {
          if (!isFetching) refetch();
        }}
      />
    );
  }

  const coverage = data.meta.coverage;

  if (coverage === "unavailable") {
    return <EmptyState icon={Info} title="Event details are not available from the data source." />;
  }

  const hasEvents = data.data.length > 0;

  return (
    <div className="space-y-3">
      {coverage === "partial" && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs text-[var(--text-secondary)]">
          Partial coverage — some event types are missing
          {data.meta.unavailable.length > 0 ? ` (${data.meta.unavailable.join(", ")}).` : "."}
        </div>
      )}
      {hasEvents ? (
        <ol className="space-y-2">
          {data.data.map((ev) => (
            <li
              key={ev.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-xs font-semibold tabular-nums">
                {formatMinute(ev)}
              </div>
              <div className="text-lg">{iconFor(ev.type)}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{ev.actor}</div>
                {ev.message && (
                  <div className="text-xs text-[var(--text-secondary)]">{ev.message}</div>
                )}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">{teamLabel(ev, match)}</div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          icon={Info}
          title={
            coverage === "partial"
              ? "No events reported in the available data."
              : "No events reported."
          }
        />
      )}
    </div>
  );
}
