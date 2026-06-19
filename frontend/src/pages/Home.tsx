// src/pages/Home.tsx
// Orchestrator only — rendering logic lives in the extracted components.

import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useSportStore } from "../store/sportFilter";
import { getMatches } from "../api/matches";
import { useWebSocket } from "../hooks/useWebSocket";

import { LiveTicker }    from "../components/LiveTicker";
import { MatchCard }     from "../components/MatchCard";
import { SectionHeader } from "../components/SectionHeader";
import { SearchBar }     from "../components/SearchBar";
import { SkeletonGrid }  from "../components/Skeletons";

import type { Match, Sport } from "../types";

// ─── Sport filter config ──────────────────────────────────────────────────────
const SPORTS: { label: string; value: Sport; emoji: string }[] = [
  { label: "All sports", value: "all",      emoji: "🏆" },
  { label: "Cricket",    value: "cricket",  emoji: "🏏" },
  { label: "Football",   value: "football", emoji: "⚽" },
];

// ─── Error state ──────────────────────────────────────────────────────────────
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <span className="text-4xl">⚠️</span>
      <p className="text-white/40 text-sm">Failed to load matches.</p>
      <button
        onClick={onRetry}
        className="px-4 py-1.5 rounded-full border border-white/15 text-white/60 text-sm
          hover:border-white/30 hover:text-white/90 transition-all duration-150 cursor-pointer bg-transparent"
      >
        Try again
      </button>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
      <span className="text-4xl">{hasSearch ? "🔍" : "🏟️"}</span>
      <p className="text-white/25 text-sm m-0">
        {hasSearch ? "No matches found" : "No matches right now"}
      </p>
      <p className="text-white/15 text-xs m-0">
        {hasSearch ? "Try a different search term" : "Check back soon"}
      </p>
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
export default function Home() {
  const { activeSport, setActiveSport } = useSportStore();
  const queryClient = useQueryClient();

  const [flashId,    setFlashId]    = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: matches = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["matches", activeSport],
    queryFn: () => getMatches(activeSport === "all" ? undefined : activeSport),
    staleTime: 60_000,
  });

  useWebSocket({
    matchId: null,
    onScoreUpdate: ({ matchId, homeScore, awayScore }) => {
      queryClient.setQueryData(
        ["matches", activeSport],
        (old: Match[] = []) =>
          old.map((m) =>
            m.id === matchId ? { ...m, homeScore, awayScore } : m,
          ),
      );
      if (flashTimer.current) clearTimeout(flashTimer.current);
      setFlashId(matchId);
      flashTimer.current = setTimeout(() => setFlashId(null), 1500);
    },
    onMatchCreated: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  // ── Search filtering (client-side, case-insensitive) ──────────────────────
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? matches.filter(
        (m) =>
          m.homeTeam.toLowerCase().includes(q) ||
          m.awayTeam.toLowerCase().includes(q) ||
          m.sport.toLowerCase().includes(q),
      )
    : matches;

  const live      = filtered.filter((m) => m.status === "live");
  const scheduled = filtered.filter((m) => m.status === "scheduled");
  const finished  = filtered.filter((m) => m.status === "finished");

  return (
    <>
      <style>{`
        @keyframes tickerPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          50%       { opacity: 0.7; box-shadow: 0 0 0 6px rgba(245,158,11,0); }
        }
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .page-section { animation: fadeUp 0.35s ease both; }
        .page-section:nth-child(1) { animation-delay: 0.00s; }
        .page-section:nth-child(2) { animation-delay: 0.08s; }
        .page-section:nth-child(3) { animation-delay: 0.16s; }
      `}</style>

      <div className="min-h-screen bg-[#0B1120] text-white">
        <LiveTicker matches={matches} />

        <div className="max-w-[1100px] mx-auto px-6 py-10">

          {/* ── Header row ── */}
          <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-base">
                  🏟️
                </div>
                <h1
                  className="text-[26px] font-bold m-0"
                  style={{
                    background:
                      "linear-gradient(90deg, #F9FAFB 60%, rgba(249,250,251,0.45))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  ScoreBoard
                </h1>
              </div>
              <p className="text-white/35 text-[13px] m-0">
                Live scores · Real-time updates
              </p>
            </div>

            {/* ✅ Search bar — top-right of header */}
            <div className="flex items-center self-center">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
          </div>

          {/* ── Sport filter tabs ── */}
          <div className="flex gap-2 flex-wrap mb-10">
            {SPORTS.map((s) => (
              <button
                key={s.value}
                onClick={() => {
                  setActiveSport(s.value);
                  setSearchQuery(""); // clear search when switching sport
                }}
                className={`
                  flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium
                  border cursor-pointer transition-all duration-200 bg-transparent
                  ${
                    activeSport === s.value
                      ? "bg-amber-500/15 border-amber-500/45 text-amber-400"
                      : "bg-white/[0.05] border-white/10 text-white/60 hover:bg-white/[0.09] hover:text-white/90"
                  }
                `}
              >
                <span>{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>

          {/* ── States ── */}
          {isLoading && <SkeletonGrid count={6} />}
          {isError   && <ErrorState onRetry={refetch} />}

          {!isLoading && !isError && (
            <div className="flex flex-col gap-12">
              {live.length > 0 && (
                <section className="page-section">
                  <SectionHeader label="Live now" count={live.length} isLive />
                  <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                    {live.map((m) => (
                      <MatchCard key={m.id} match={m} flashId={flashId} />
                    ))}
                  </div>
                </section>
              )}

              {scheduled.length > 0 && (
                <section className="page-section">
                  <SectionHeader label="Upcoming" count={scheduled.length} />
                  <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                    {scheduled.map((m) => (
                      <MatchCard key={m.id} match={m} flashId={flashId} />
                    ))}
                  </div>
                </section>
              )}

              {finished.length > 0 && (
                <section className="page-section">
                  <SectionHeader label="Results" count={finished.length} />
                  <div className="grid gap-4 opacity-65 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
                    {finished.map((m) => (
                      <MatchCard key={m.id} match={m} flashId={null} />
                    ))}
                  </div>
                </section>
              )}

              {filtered.length === 0 && (
                <EmptyState hasSearch={!!q} />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}