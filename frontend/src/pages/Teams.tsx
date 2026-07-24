import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { getCompetitions, getTeams, type TeamEntry } from "@/api/standings";

function Initials({ label }: { label: string }) {
  const initials = label
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 3)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-sm font-semibold text-[var(--text-secondary)]">
      {initials}
    </div>
  );
}

function TeamCard({ team }: { team: TeamEntry }) {
  const [err, setErr] = useState(false);
  const label = team.shortName ?? team.name;
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-center">
      {team.crest && !err ? (
        <img
          src={team.crest}
          alt={team.name}
          onError={() => setErr(true)}
          className="h-16 w-16 object-contain"
        />
      ) : (
        <Initials label={label} />
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{team.name}</div>
        <div className="truncate text-xs text-[var(--text-secondary)]">
          {team.area?.name}
        </div>
      </div>
    </div>
  );
}

export default function Teams() {
  const [selectedCode, setSelectedCode] = useState<string>("PL");
  const { data: comps } = useQuery({
    queryKey: ["competitions"],
    queryFn: getCompetitions,
  });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["teams", selectedCode],
    queryFn: () => getTeams(selectedCode),
    enabled: !!selectedCode,
  });

  const teams = data?.data?.teams ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Teams</h1>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
          style={{ background: "var(--accent-football)" }}
        >
          Football
        </span>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        Browse teams from tracked competitions
      </p>

      <select
        value={selectedCode}
        onChange={(e) => setSelectedCode(e.target.value)}
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)]"
      >
        {(comps ?? [{ code: "PL", name: "Premier League" }]).map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </select>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="Couldn't load teams." onRetry={() => refetch()} />
      ) : teams.length === 0 ? (
        <EmptyState icon={Users} title="No teams found" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      )}
    </div>
  );
}
