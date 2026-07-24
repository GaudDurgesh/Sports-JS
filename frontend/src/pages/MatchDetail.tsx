import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Share2, Star } from "lucide-react";
import { toast } from "sonner";
import { getMatch } from "@/api/matches";
import ScoreHeader from "@/components/match/ScoreHeader";
import TabBar from "@/components/match/TabBar";
import OverviewTab from "@/components/detail/OverviewTab";
import ScorecardTab from "@/components/detail/ScorecardTab";
import EventsTab from "@/components/detail/EventsTab";
import CommentaryTab from "@/components/detail/CommentaryTab";
import HeadToHeadTab from "@/components/detail/HeadToHeadTab";
import ErrorState from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";

type TabId = "overview" | "scorecard" | "events" | "commentary" | "h2h";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "scorecard", label: "Scorecard" },
  { id: "events", label: "Events" },
  { id: "commentary", label: "Commentary" },
  { id: "h2h", label: "Head to Head" },
];

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("overview");
  const [starred, setStarred] = useState(false);

  const { data: match, isLoading, isError, refetch } = useQuery({
    queryKey: ["match", id],
    queryFn: () => getMatch(id!),
    enabled: !!id,
  });

  const accent = match?.sport === "cricket"
    ? "var(--accent-cricket)"
    : "var(--accent-football)";

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
        >
          <ChevronLeft size={18} />
          <span className="text-sm">Back</span>
        </button>
        <div className="text-sm font-semibold">Match Details</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast.success("Link copied");
            }}
            className="rounded-md p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
          >
            <Share2 size={16} />
          </button>
          <button
            onClick={() => {
              if (!user) {
                toast("Log in to save favorites");
                return;
              }
              setStarred((s) => !s);
            }}
            className="rounded-md p-1.5 hover:bg-[var(--bg-elevated)]"
            style={{
              color: starred && user ? "var(--accent-live)" : "var(--text-secondary)",
            }}
          >
            <Star size={16} fill={starred && user ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <>
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </>
      ) : isError || !match ? (
        <ErrorState message="Match not found or API unreachable." onRetry={() => refetch()} />
      ) : (
        <>
          <ScoreHeader match={match} />
          <TabBar
            tabs={TABS}
            active={tab}
            onChange={(id) => setTab(id as TabId)}
            accent={accent}
          />
          <div className="pt-2">
            {tab === "overview" && <OverviewTab match={match} />}
            {tab === "scorecard" && <ScorecardTab match={match} />}
            {tab === "events" && <EventsTab match={match} />}
            {tab === "commentary" && <CommentaryTab />}
            {tab === "h2h" && <HeadToHeadTab />}
          </div>
        </>
      )}
    </div>
  );
}
