import { useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMatches } from "@/api/matches";
import { getCompetitions } from "@/api/standings";
import HeroBanner from "@/components/match/HeroBanner";
import SectionRow from "@/components/match/SectionRow";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Inbox } from "lucide-react";
import type { Match, Sport, MatchStatus } from "@/types";

export default function Home() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["matches"],
    queryFn: getMatches,
  });

  const filterSport: Sport | null =
    location.pathname === "/cricket"
      ? "cricket"
      : location.pathname === "/football"
        ? "football"
        : null;
  const filterStatus: MatchStatus | null =
    location.pathname === "/live" ? "live" : null;

  const competitionCode =
    filterSport === "football" ? searchParams.get("competition") : null;

  const { data: comps } = useQuery({
    queryKey: ["competitions"],
    queryFn: getCompetitions,
    enabled: !!competitionCode,
  });
  const competitionName =
    comps?.find((c) => c.code === competitionCode)?.name ?? competitionCode;

  const matches: Match[] = (data ?? []).filter((m) => {
    if (filterSport && m.sport !== filterSport) return false;
    if (filterStatus && m.status !== filterStatus) return false;
    if (competitionCode && m.metadata?.competitionCode !== competitionCode)
      return false;
    return true;
  });

  const live = matches.filter((m) => m.status === "live");
  const upcoming = matches.filter((m) => m.status === "scheduled");
  const finished = matches.filter((m) => m.status === "finished");

  const hero = live.length > 0 ? live : upcoming;

  const pageTitle =
    filterSport === "cricket"
      ? "Cricket"
      : filterSport === "football"
        ? "Football"
        : filterStatus === "live"
          ? "Live"
          : "Home";

  const clearCompetition = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("competition");
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">{pageTitle}</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Live cricket and football at a glance
        </p>
      </div>

      {competitionCode && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={clearCompetition}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          >
            {competitionName}
            <X size={12} />
          </button>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-[220px] w-full rounded-2xl" />
      ) : isError ? (
        <ErrorState
          message="Couldn't load matches. Make sure the API is running at the configured URL."
          onRetry={() => refetch()}
        />
      ) : competitionCode && matches.length === 0 ? (
        <EmptyState icon={Inbox} title="No matches found for this competition" />
      ) : (
        <>
          <HeroBanner matches={hero} />
          <SectionRow title="Live Now" matches={live} viewAllTo="/live" />
          <SectionRow title="Upcoming Matches" matches={upcoming} />
          <SectionRow title="Recent Results" matches={finished} />
        </>
      )}
    </div>
  );
}
