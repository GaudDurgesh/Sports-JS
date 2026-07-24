import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import TabBar from "@/components/match/TabBar";
import { Skeleton } from "@/components/ui/skeleton";
import { getCompetitions, type Competition } from "@/api/standings";

function LeagueCard({ comp, onClick }: { comp: Competition; onClick: () => void }) {
  const [err, setErr] = useState(false);
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-left transition hover:bg-[var(--bg-elevated)]"
    >
      {comp.emblem && !err ? (
        <img
          src={comp.emblem}
          alt={comp.name}
          onError={() => setErr(true)}
          className="h-12 w-12 shrink-0 object-contain"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
          <Trophy size={20} className="text-[var(--text-secondary)]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{comp.name}</div>
        <div className="truncate text-xs text-[var(--text-secondary)]">
          {comp.country ?? "—"}
        </div>
      </div>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase text-white"
        style={{ background: "var(--accent-football)" }}
      >
        Football
      </span>
    </button>
  );
}

export default function Leagues() {
  const [tab, setTab] = useState<"football" | "cricket">("football");
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["competitions"],
    queryFn: getCompetitions,
    enabled: tab === "football",
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Leagues</h1>
      <TabBar
        tabs={[
          { id: "football", label: "Football" },
          { id: "cricket", label: "Cricket" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as "football" | "cricket")}
        accent={tab === "cricket" ? "var(--accent-cricket)" : "var(--accent-football)"}
      />
      <div className="pt-2">
        {tab === "cricket" ? (
          <EmptyState icon={Trophy} title="Cricket league data coming soon" />
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState message="Couldn't load leagues." onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Trophy} title="League data coming soon" />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data.map((c) => (
              <LeagueCard
                key={c.code}
                comp={c}
                onClick={() => navigate(`/football?competition=${c.code}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
