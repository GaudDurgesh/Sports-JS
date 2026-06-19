import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from '../hooks/useWebSocket'
import { getMatch } from '../api/matches'
import { getCommentary } from '../api/commentary'
import ScoreHeader from '../components/ScoreHeader'
import CricketScorecard from '../components/CricketScorecard'
import FootballDetail from '../components/FootballDetail'
import CommentaryFeed from '../components/CommentaryFeed'
import { SkeletonHeader, SkeletonFeed } from '../components/Skeletons'
import type { Match, Commentary } from '../types'

// ─── Shared sub-components ────────────────────────────────────────────────────
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-transparent
        border border-white/10 text-white/60 text-sm font-medium cursor-pointer
        transition-all duration-150 hover:border-white/25 hover:text-white/90"
    >
      ← Back
    </button>
  )
}

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
      <span className="text-4xl">⚠️</span>
      <p className="text-white/35 text-sm m-0">{message}</p>
      <BackButton onClick={onBack} />
    </div>
  )
}

// ─── Cricket commentary section ───────────────────────────────────────────────
// Commentary is only meaningful for cricket (ball-by-ball events
// entered manually via admin). For football, events come from
// FootballDetail via the /events API route instead.
function CommentarySection({
  isLoading,
  commentary,
}: {
  isLoading: boolean
  commentary: Commentary[]
}) {
  return (
    <div style={{
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.02)',
      padding: '16px 20px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>📢</span>
          <span style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Commentary
          </span>
        </div>
        {!isLoading && (
          <span style={{
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.25)',
            fontSize: 11,
            padding: '2px 10px',
            borderRadius: 20,
          }}>
            {commentary.length} events
          </span>
        )}
      </div>

      {isLoading && <SkeletonFeed rows={3} />}

      {!isLoading && commentary.length === 0 && (
        <div style={{
          padding: '32px 0',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.2)',
          fontSize: 13,
        }}>
          No commentary yet
        </div>
      )}

      {!isLoading && commentary.length > 0 && (
        <CommentaryFeed items={commentary} />
      )}
    </div>
  )
}

// ─── MATCH DETAIL PAGE ────────────────────────────────────────────────────────
export default function MatchDetail() {
  const { id } = useParams()
  const matchId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const onBack = () => navigate(-1)

  const [liveCommentary, setLiveCommentary] = useState<Commentary[]>([])

  // Guard non-numeric route params before any hooks
  if (isNaN(matchId)) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-white flex items-center justify-center">
        <ErrorState message="Invalid match ID." onBack={onBack} />
      </div>
    )
  }

  // ── Queries ──
  const {
    data: match,
    isLoading: matchLoading,
    isError: matchError,
  } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => getMatch(matchId),
    staleTime: 30_000,
  })

  // Commentary only fetched for cricket — football uses /events route
  const {
    data: commentaryData = [],
    isLoading: commentaryLoading,
  } = useQuery({
    queryKey: ['commentary', matchId],
    queryFn: () => getCommentary(matchId),
    staleTime: match?.status === 'finished' ? 5 * 60_000 : 30_000,
    // Only fetch commentary when match is loaded AND it's a cricket match
    enabled: !!match && match.sport === 'cricket',
  })

  // ── WebSocket ──
  useWebSocket({
    matchId,
    onScoreUpdate: ({ matchId: mid, homeScore, awayScore }) => {
      queryClient.setQueryData(
        ['match', mid],
        (old: Match | undefined) => old ? { ...old, homeScore, awayScore } : old
      )
    },
    onCommentary: (entry: Commentary) => {
      setLiveCommentary(prev => {
        if (prev.some(c => c.id === entry.id)) return prev
        return [entry, ...prev]
      })
    },
  })

  // ── Merge commentary (cricket only) ──
  const mergedCommentary = (() => {
    const seen = new Set<number>()
    return [...liveCommentary, ...commentaryData].filter(c => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  })()

  return (
    <div className="min-h-screen bg-[#0B1120] text-white">
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes tickerPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          50%       { opacity: 0.6; box-shadow: 0 0 0 6px rgba(245,158,11,0); }
        }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-16">

        {/* Back */}
        <div className="mb-5">
          <BackButton onClick={onBack} />
        </div>

        {/* Hard error */}
        {matchError && (
          <ErrorState
            message="Could not load this match. It may no longer exist."
            onBack={onBack}
          />
        )}

        {/* Loading */}
        {matchLoading && !matchError && (
          <div className="flex flex-col gap-6">
            <SkeletonHeader />
            <SkeletonFeed rows={4} />
          </div>
        )}

        {/* Content — branches on sport */}
        {!matchLoading && !matchError && match && (
          <div className="flex flex-col gap-5">

            {/* Score header — same for both sports */}
            <ScoreHeader match={match} />

            {/* ── Cricket: innings scorecard + commentary ── */}
            {match.sport === 'cricket' && (
              <>
                <CricketScorecard match={match} />
                <CommentarySection
                  isLoading={commentaryLoading}
                  commentary={mergedCommentary}
                />
              </>
            )}

            {/* ── Football: crests + score breakdown + events ── */}
            {match.sport === 'football' && (
              <FootballDetail match={match} />
            )}

          </div>
        )}

      </div>
    </div>
  )
}