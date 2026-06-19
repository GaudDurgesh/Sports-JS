// src/components/ScoreHeader.tsx

import type { Match } from '../types'
import { getSportHex } from '../utils/sport'

interface ScoreHeaderProps {
  match: Match
}

const SPORT_META: Record<string, { emoji: string; label: string }> = {
  cricket:    { emoji: '🏏', label: 'Cricket' },
  football:   { emoji: '⚽', label: 'Football' },
  kabaddi:    { emoji: '🤸', label: 'Kabaddi' },
  basketball: { emoji: '🏀', label: 'Basketball' },
}

const TEAM_PALETTE = [
  '#3B82F6', '#EC4899', '#22C55E', '#EAB308', '#8B5CF6',
  '#06B6D4', '#F43F5E', '#A855F7', '#14B8A6', '#F97316',
]

function getTeamColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return TEAM_PALETTE[hash % TEAM_PALETTE.length]
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day:      'numeric',
    month:    'short',
    hour:     '2-digit',
    minute:   '2-digit',
    timeZone: 'Asia/Kolkata',
  })
}

function humanizeKey(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

// ─── Cricket runs per team ───────────────────────────────────────────────────
// Sums innings runs per team from metadata innings array.
//
// Priority — mirrors resolveTeamName in cricketUtils:
//   1. Exact label prefix match  ("India Inning 1".startsWith("India"))
//      → always works for Cricbuzz data (labels we construct ourselves)
//   2. Unique-word fuzzy match   → handles legacy CricAPI rows in the DB
//   3. Index parity fallback     → last resort
function sumCricketRuns(
  innings: Array<{ label: string; runs: number }>,
  homeTeam: string,
  awayTeam: string,
): { homeRuns: number; awayRuns: number } | null {
  if (!innings || innings.length === 0) return null

  // Pre-compute unique words once (for fuzzy fallback on legacy rows)
  const allHomeWords = homeTeam.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const allAwayWords = awayTeam.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const sharedWords  = new Set(allHomeWords.filter(w => allAwayWords.includes(w)))
  const homeWords    = allHomeWords.filter(w => !sharedWords.has(w))
  const awayWords    = allAwayWords.filter(w => !sharedWords.has(w))

  let homeRuns = 0, awayRuns = 0, anyMatched = false

  innings.forEach((inn, i) => {
    const label = inn.label ?? ''
    const lbl   = label.toLowerCase()

    // 1. Exact prefix (Cricbuzz)
    if (label.startsWith(homeTeam))      { homeRuns += inn.runs; anyMatched = true; return }
    if (label.startsWith(awayTeam))      { awayRuns += inn.runs; anyMatched = true; return }

    // 2. Unique-word fuzzy (CricAPI legacy)
    const isHome = homeWords.length > 0 && homeWords.some(w => lbl.includes(w))
    const isAway = awayWords.length > 0 && awayWords.some(w => lbl.includes(w))
    if (isHome && !isAway) { homeRuns += inn.runs; anyMatched = true; return }
    if (isAway && !isHome) { awayRuns += inn.runs; anyMatched = true; return }

    // 3. Index parity
    if (i % 2 === 0) homeRuns += inn.runs
    else             awayRuns += inn.runs
  })

  return anyMatched ? { homeRuns, awayRuns } : null
}

// ─── Winner resolution ────────────────────────────────────────────────────────
// Returns the winning team name, 'draw', or null (if match not finished).
// Cricket: sum runs per team using label-based innings assignment.
// Football / others: compare homeScore vs awayScore directly.
function resolveWinner(match: Match): { winner: string | 'draw' } | null {
  if (match.status !== 'finished') return null

  if (match.sport === 'cricket') {
    const innings = (match.metadata as any)?.innings as Array<{
      label: string; runs: number; wickets: number | null
    }> | undefined

    const totals = innings ? sumCricketRuns(innings, match.homeTeam, match.awayTeam) : null
    if (totals) {
      if (totals.homeRuns === totals.awayRuns) return { winner: 'draw' }
      return { winner: totals.homeRuns > totals.awayRuns ? match.homeTeam : match.awayTeam }
    }
  }

  // Football / fallback: direct score comparison
  if (match.homeScore === match.awayScore) return { winner: 'draw' }
  return { winner: match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam }
}

// ─── Winner Banner ────────────────────────────────────────────────────────────
function WinnerBanner({ match }: { match: Match }) {
  const result = resolveWinner(match)
  if (!result) return null

  const isDraw = result.winner === 'draw'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 18,
      padding: '10px 16px',
      borderRadius: 12,
      background: isDraw
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(34,197,94,0.08)',
      border: isDraw
        ? '1px solid rgba(255,255,255,0.08)'
        : '1px solid rgba(34,197,94,0.2)',
    }}>
      <span style={{ fontSize: 15 }}>
        {isDraw ? '🤝' : '🏆'}
      </span>
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: isDraw ? 'rgba(255,255,255,0.45)' : '#86EFAC',
        letterSpacing: '0.01em',
      }}>
        {isDraw
          ? 'Match drawn'
          : <>{result.winner} <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>won</span></>
        }
      </span>
    </div>
  )
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Match['status'] }) {
  if (status === 'live') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(245,158,11,0.12)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 999, padding: '5px 12px',
      }}>
        <span className="sh-pulse-dot" />
        <span style={{ color: '#F59E0B', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>
          LIVE
        </span>
      </div>
    )
  }
  if (status === 'finished') {
    return (
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: '5px 12px' }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>
          FULL TIME
        </span>
      </div>
    )
  }
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: '5px 12px' }}>
      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}>
        UPCOMING
      </span>
    </div>
  )
}

// ─── ScoreDisplay ─────────────────────────────────────────────────────────────
function ScoreDisplay({
  score, sport, metadata, accent, align = 'flex-start',
}: {
  score: number
  sport: string
  metadata?: Match['metadata']
  accent: string
  align?: 'flex-start' | 'flex-end'
}) {
  const wickets = sport === 'cricket' ? (metadata as any)?.wickets : undefined

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: align, gap: 4 }}>
      <span style={{
        fontSize: 52, fontWeight: 700, lineHeight: 1,
        fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
        fontVariantNumeric: 'tabular-nums',
        color: accent,
      }}>
        {score}
      </span>
      {wickets != null && (
        <span style={{
          fontSize: 24, fontWeight: 600, lineHeight: 1,
          fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
          color: 'rgba(255,255,255,0.35)',
        }}>
          /{String(wickets)}
        </span>
      )}
    </div>
  )
}

// ─── TeamBlock ────────────────────────────────────────────────────────────────
function TeamBlock({
  name, score, sport, metadata, accent, align, isWinner,
}: {
  name: string
  score: number
  sport: string
  metadata?: Match['metadata']
  accent: string
  align: 'left' | 'right'
  isWinner: boolean
}) {
  const teamColor = getTeamColor(name)
  const isRight = align === 'right'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isRight ? 'flex-end' : 'flex-start',
      gap: 12, minWidth: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        flexDirection: isRight ? 'row-reverse' : 'row',
        minWidth: 0,
      }}>
        {/* Team avatar — glows green if winner */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: isWinner ? `rgba(34,197,94,0.15)` : `${teamColor}22`,
          border: isWinner ? '1px solid rgba(34,197,94,0.5)' : `1px solid ${teamColor}55`,
          boxShadow: isWinner ? '0 0 10px rgba(34,197,94,0.2)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700,
          color: isWinner ? '#86EFAC' : teamColor,
          flexShrink: 0,
          transition: 'all 0.2s ease',
        }}>
          {getInitials(name)}
        </div>
        <span style={{
          color: isWinner ? '#F1F5F9' : 'rgba(255,255,255,0.65)',
          fontSize: 16, fontWeight: isWinner ? 600 : 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
      </div>
      <ScoreDisplay
        score={score} sport={sport} metadata={metadata}
        accent={accent} align={isRight ? 'flex-end' : 'flex-start'}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ScoreHeader({ match }: ScoreHeaderProps) {
  const accent = getSportHex(match.sport)
  const sportMeta = SPORT_META[match.sport] ?? { emoji: '🏅', label: match.sport }
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'

  const scoreColor =
    isLive      ? accent
    : isFinished  ? 'rgba(255,255,255,0.9)'
    : 'rgba(255,255,255,0.4)'

  const winnerResult = resolveWinner(match)
  const homeIsWinner = isFinished && winnerResult?.winner === match.homeTeam
  const awayIsWinner = isFinished && winnerResult?.winner === match.awayTeam

  // For cricket, derive displayed score by summing innings runs per team.
  // We match each innings label directly against the team name stored in the DB
  // (case-insensitive substring), which is the same name shown in the header.
  // This avoids any circular dependency on home/away ordering being correct.
  const innings = match.sport === 'cricket'
    ? ((match.metadata as any)?.innings as Array<{ label: string; runs: number; wickets: number | null }> | undefined)
    : undefined

  const cricketScores = innings
    ? sumCricketRuns(innings, match.homeTeam, match.awayTeam)
    : null
  const displayHomeScore = cricketScores?.homeRuns ?? match.homeScore
  const displayAwayScore = cricketScores?.awayRuns ?? match.awayScore

  const metadataEntries = Object.entries(match.metadata ?? {}).filter(
    ([key, value]) =>
      key !== 'innings' &&
      !(key === 'wickets' && match.sport === 'cricket') &&
      (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
  )

  return (
    <div
      className="score-header"
      style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${accent}14, #0F172A 65%)`,
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '26px 24px 22px',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .score-header .sh-accent-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: ${accent};
          ${isLive ? 'animation: shAccentPulse 2s ease-in-out infinite;' : 'opacity: 0.5;'}
        }
        @keyframes shAccentPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .sh-pulse-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #F59E0B; display: inline-block;
          animation: shDotPulse 1.4s ease-in-out infinite;
        }
        @keyframes shDotPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          50%      { opacity: 0.6; box-shadow: 0 0 0 6px rgba(245,158,11,0); }
        }
        @media (max-width: 480px) {
          .score-header .sh-grid { grid-template-columns: 1fr !important; gap: 18px !important; }
          .score-header .sh-divider { display: none; }
        }
      `}</style>

      <div className="sh-accent-bar" />

      {/* Sport tag + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>{sportMeta.emoji}</span>
          <span style={{ color: accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {sportMeta.label}
          </span>
        </div>
        <StatusBadge status={match.status} />
      </div>

      {/* Score grid */}
      <div className="sh-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 20 }}>
        <TeamBlock
          name={match.homeTeam} score={displayHomeScore}
          sport={match.sport} metadata={match.metadata}
          accent={scoreColor} align="left"
          isWinner={homeIsWinner}
        />
        <div className="sh-divider" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>VS</span>
          <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <TeamBlock
          name={match.awayTeam} score={displayAwayScore}
          sport={match.sport} metadata={match.metadata}
          accent={scoreColor} align="right"
          isWinner={awayIsWinner}
        />
      </div>

      {/* ✅ Winner banner — only shown when match is finished */}
      <WinnerBanner match={match} />

      {/* Footer: date + metadata chips */}
      <div style={{
        marginTop: 16, paddingTop: 16,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
          {formatDate(match.startTime)}
        </span>

        {metadataEntries.map(([key, value]) => (
          <div key={key} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8, padding: '4px 10px', fontSize: 12,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>{humanizeKey(key)}</span>
            <span style={{ color: '#F9FAFB', fontWeight: 600, marginLeft: 6 }}>{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}