import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getScorers } from "@/api/standings";
import type { Match } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Users } from "lucide-react";

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[10px] font-semibold text-[var(--text-secondary)]">
      {initials}
    </div>
  );
}

function CrestOrInitials({ src, name }: { src?: string; name: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) return <Initials name={name} />;
  return (
    <img
      src={src}
      alt={name}
      onError={() => setErr(true)}
      className="h-8 w-8 rounded-full object-contain"
    />
  );
}

export default function TopPlayersWidget({ match }: { match: Match }) {
  const code = match.metadata?.competitionCode;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["scorers", code],
    queryFn: () => getScorers(code!),
    enabled: !!code,
    retry: false,
  });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="mb-3 text-sm font-semibold">Top Players</div>
      {!code ? (
        <EmptyState icon={Users} title="No player data available" />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="text-xs text-[var(--text-secondary)]">Could not load players</div>
      ) : (
        <ul className="space-y-2">
          {(data?.data?.scorers ?? []).slice(0, 3).map((s, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-xl bg-[var(--bg-elevated)] p-2"
            >
              <CrestOrInitials src={s.team?.crest} name={s.team?.name ?? "?"} />
              <div className="flex-1 truncate">
                <div className="truncate text-sm font-medium">{s.player?.name}</div>
                <div className="truncate text-[10px] text-[var(--text-secondary)]">
                  {s.team?.name}
                </div>
              </div>
              <span className="rounded-full bg-[var(--accent-cricket)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-cricket)]">
                {s.goals} goals
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
