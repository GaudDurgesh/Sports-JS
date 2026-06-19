import { useQuery } from '@tanstack/react-query'
import { getMatchEvents } from '../api/events'
import type { Match } from '../types'

interface Props {
  match: Match
}

// ─── Team crest with initials fallback ───────────────────────────────────────
function TeamCrest({ crest, name, size = 48 }: { crest: string | null; name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  if (crest) {
    return (
      <img
        src={crest}
        alt={name}
        width={size}
        height={size}
        style={{ objectFit: 'contain', display: 'block' }}
        onError={e => {
          // If SVG fails to load, show initials fallback
          const target = e.currentTarget
          target.style.display = 'none'
          const sibling = target.nextElementSibling as HTMLElement
          if (sibling) sibling.style.display = 'flex'
        }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
    }}>
      {initials}
    </div>
  )
}

// ─── Half-time / Full-time score strip ───────────────────────────────────────
function ScoreStrip({
  homeTeam, awayTeam, score
}: {
  homeTeam: string
  awayTeam: string
  score: { fullTime: { home: number | null; away: number | null }; halfTime: { home: number | null; away: number | null } }
}) {
  const htHome = score.halfTime.home
  const htAway = score.halfTime.away
  const hasHalfTime = htHome !== null && htAway !== null

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {hasHalfTime && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Half time</span>
          <span style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'SF Mono', monospace",
            fontVariantNumeric: 'tabular-nums',
          }}>
            {htHome} – {htAway}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>
          {hasHalfTime ? 'Full time' : 'Score'}
        </span>
        <span style={{
          color: '#F9FAFB',
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "'SF Mono', monospace",
          fontVariantNumeric: 'tabular-nums',
        }}>
          {score.fullTime.home ?? 0} – {score.fullTime.away ?? 0}
        </span>
      </div>
    </div>
  )
}

// ─── Goals list ──────────────────────────────────────────────────────────────
function normaliseTeamName(name: string | null): string {
  return (name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function GoalsList({ goals, homeTeam, awayTeam }: {
  goals: { minute: number; team: string | null; scorer: string | null; assist: string | null; type: string }[]
  homeTeam: string
  awayTeam: string
}) {
  if (goals.length === 0) return null

  const normHome = normaliseTeamName(homeTeam)
  const normAway = normaliseTeamName(awayTeam)

  // Determine which side a goal belongs to.
  // Priority: exact normalised match → partial token match → fallback to home.
  function resolveGoalSide(goalTeam: string | null): 'home' | 'away' {
    const norm = normaliseTeamName(goalTeam)
    if (!norm) return 'home'
    if (norm === normHome) return 'home'
    if (norm === normAway) return 'away'
    // token-level partial match (e.g. "Manchester" inside "manchestercity")
    if (normHome.includes(norm) || norm.includes(normHome)) return 'home'
    if (normAway.includes(norm) || norm.includes(normAway)) return 'away'
    return 'home'
  }

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 13 }}>⚽</span>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Goals
        </span>
      </div>
      {goals.map((g, i) => {
        const isHome = resolveGoalSide(g.team) === 'home'
        return (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 14px',
            borderBottom: i < goals.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            flexDirection: isHome ? 'row' : 'row-reverse',
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#22C55E',
              fontFamily: "'SF Mono', monospace",
              minWidth: 32,
              textAlign: isHome ? 'left' : 'right',
            }}>
              {g.minute}'
            </span>
            <div style={{ flex: 1, paddingLeft: isHome ? 10 : 0, paddingRight: isHome ? 0 : 10, textAlign: isHome ? 'left' : 'right' }}>
              <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>
                {g.scorer ?? 'Unknown'}
              </span>
              {g.type === 'OWN_GOAL' && (
                <span style={{ color: '#EF4444', fontSize: 10, marginLeft: 4 }}>(og)</span>
              )}
              {g.type === 'PENALTY' && (
                <span style={{ color: '#F59E0B', fontSize: 10, marginLeft: 4 }}>(pen)</span>
              )}
              {g.assist && (
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 }}>
                  Assist: {g.assist}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Cards list ──────────────────────────────────────────────────────────────
function CardsList({ bookings }: {
  bookings: { minute: number; team: string | null; player: string | null; card: string }[]
}) {
  if (bookings.length === 0) return null

  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 13 }}>🟨</span>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Cards
        </span>
      </div>
      {bookings.map((b, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          borderBottom: i < bookings.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: b.card === 'RED' ? '#EF4444' : '#EAB308',
            fontFamily: "'SF Mono', monospace",
            minWidth: 32,
          }}>
            {b.minute}'
          </span>
          <span style={{ fontSize: 14 }}>{b.card === 'RED' ? '🟥' : '🟨'}</span>
          <div>
            <span style={{ color: '#F1F5F9', fontSize: 13 }}>{b.player ?? 'Unknown'}</span>
            {b.team && (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginLeft: 6 }}>
                · {b.team}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function FootballDetail({ match }: Props) {
  const { data: events, isLoading, isError } = useQuery({
    queryKey: ['events', match.id],
    queryFn: () => getMatchEvents(match.id),
    staleTime: match.status === 'finished' ? Infinity : 30_000,
    enabled: match.sport === 'football',
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2].map(i => (
          <div key={i} style={{
            height: 60, borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            animation: 'pulse 1.8s ease-in-out infinite',
          }} />
        ))}
      </div>
    )
  }

  if (isError || !events) {
    return (
      <div style={{
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.07)',
        padding: '20px',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.25)',
        fontSize: 13,
      }}>
        Match details unavailable
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Competition banner */}
      {events.competition.name && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {events.competition.emblem && (
            <img
              src={events.competition.emblem}
              alt={events.competition.name}
              width={24}
              height={24}
              style={{ objectFit: 'contain' }}
            />
          )}
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500 }}>
            {events.competition.name}
          </span>
        </div>
      )}

      {/* Teams with crests */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 16,
        padding: '20px 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
      }}>
        {/* Home */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <TeamCrest crest={events.homeTeam.crest} name={events.homeTeam.name} size={52} />
          <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
            {events.homeTeam.shortName}
          </span>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            fontFamily: "'SF Mono', monospace",
            fontVariantNumeric: 'tabular-nums',
            color: '#F9FAFB',
            lineHeight: 1,
          }}>
            {match.homeScore} – {match.awayScore}
          </div>
          {match.status === 'live' && (
            <div style={{
              marginTop: 6, display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#F59E0B',
                display: 'inline-block', animation: 'pulse 1.4s ease-in-out infinite',
              }} />
              <span style={{ color: '#F59E0B', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>LIVE</span>
            </div>
          )}
          {match.status === 'finished' && (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 4, fontWeight: 600, letterSpacing: '0.08em' }}>
              FULL TIME
            </div>
          )}
        </div>

        {/* Away */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <TeamCrest crest={events.awayTeam.crest} name={events.awayTeam.name} size={52} />
          <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
            {events.awayTeam.shortName}
          </span>
        </div>
      </div>

      {/* Half-time / Full-time breakdown */}
      <ScoreStrip
        homeTeam={events.homeTeam.shortName}
        awayTeam={events.awayTeam.shortName}
        score={events.score}
      />

      {/* Goals — only shown if API returned any */}
      <GoalsList goals={events.goals} homeTeam={events.homeTeam.shortName} awayTeam={events.awayTeam.shortName} />

      {/* Cards */}
      <CardsList bookings={events.bookings} />

      {/* No events fallback */}
      {events.goals.length === 0 && events.bookings.length === 0 && events.substitutions.length === 0 && (
        <div style={{
          padding: '16px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.2)',
          fontSize: 12,
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
        }}>
          {match.status === 'scheduled'
            ? 'Match has not started yet'
            : 'Detailed match events not available on free tier'}
        </div>
      )}
    </div>
  )
}