import { useRef, useMemo, useState } from 'react'
import type { Commentary } from '../types'

// ─── Event config ─────────────────────────────────────────────────────────────
// Single source of truth for every eventType that exists in your data.
// icon: emoji rendered in the dot; color: left-border + dot bg accent;
// filter: which pill this event belongs to.

type FilterKey = 'all' | 'goals' | 'boundaries' | 'cards'

interface EventConfig {
  icon: string
  color: string
  filter: FilterKey
  label: string
}

const EVENT_CONFIG: Record<string, EventConfig> = {
  // Football
  goal:         { icon: '⚽', color: '#22C55E', filter: 'goals',      label: 'Goal'         },
  yellow_card:  { icon: '🟨', color: '#EAB308', filter: 'cards',      label: 'Yellow Card'  },
  red_card:     { icon: '🟥', color: '#EF4444', filter: 'cards',      label: 'Red Card'     },
  shot:         { icon: '🎯', color: '#3B82F6', filter: 'all',        label: 'Shot'         },
  save:         { icon: '🧤', color: '#6366F1', filter: 'all',        label: 'Save'         },
  foul:         { icon: '⚠️', color: '#F97316', filter: 'cards',      label: 'Foul'         },
  substitution: { icon: '🔄', color: '#8B5CF6', filter: 'all',        label: 'Substitution' },
  kickoff:      { icon: '🏁', color: '#64748B', filter: 'all',        label: 'Kick-off'     },
  pass:         { icon: '➡️', color: '#475569', filter: 'all',        label: 'Pass'         },
  // Cricket
  wicket:       { icon: '🏏', color: '#EF4444', filter: 'goals',      label: 'Wicket'       },
  four:         { icon: '4️⃣', color: '#3B82F6', filter: 'boundaries', label: 'Four'         },
  six:          { icon: '6️⃣', color: '#8B5CF6', filter: 'boundaries', label: 'Six'          },
  over_end:     { icon: '🔚', color: '#475569', filter: 'all',        label: 'Over End'     },
  run:          { icon: '🏃', color: '#64748B', filter: 'all',        label: 'Run'          },
  // Basketball
  basket:       { icon: '🏀', color: '#F97316', filter: 'goals',      label: 'Basket'       },
  three:        { icon: '3️⃣', color: '#8B5CF6', filter: 'boundaries', label: '3-Pointer'    },
  timeout:      { icon: '⏱️', color: '#64748B', filter: 'all',        label: 'Timeout'      },
  tipoff:       { icon: '🏁', color: '#64748B', filter: 'all',        label: 'Tip-off'      },
  // Kabaddi (future-proof)
  raid:         { icon: '⚡', color: '#F59E0B', filter: 'boundaries', label: 'Raid'         },
  tackle:       { icon: '🛡️', color: '#14B8A6', filter: 'cards',      label: 'Tackle'       },
  // Generic fallback
  start:        { icon: '▶️', color: '#64748B', filter: 'all',        label: 'Start'        },
  event:        { icon: '📋', color: '#475569', filter: 'all',        label: 'Event'        },
}

const FALLBACK_CONFIG: EventConfig = {
  icon: '📋', color: '#475569', filter: 'all', label: 'Event',
}

function getEventConfig(eventType: string | null): EventConfig {
  if (!eventType) return FALLBACK_CONFIG
  return EVENT_CONFIG[eventType] ?? FALLBACK_CONFIG
}

// ─── Filter pills config ──────────────────────────────────────────────────────
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',        label: 'All'              },
  { key: 'goals',      label: 'Goals / Wickets'  },
  { key: 'boundaries', label: 'Boundaries / 6s'  },
  { key: 'cards',      label: 'Cards / Raids'    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(minute: number, period: string): string {
  return `${minute}' · ${period}`
}

// ─── Single commentary row ────────────────────────────────────────────────────
function CommentaryRow({
  item,
  isNew,
}: {
  item: Commentary
  isNew: boolean
}) {
  const cfg = getEventConfig(item.eventType)

  return (
    <div
      className={isNew ? 'cf-slide-in' : undefined}
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderLeft: `3px solid ${cfg.color}`,
        paddingLeft: 14,
        // New entries get a brief bg flash — handled via CSS class below
        transition: 'background 0.4s ease',
      }}
    >
      {/* Time column — fixed width so all rows align */}
      <div
        style={{
          flexShrink: 0,
          width: 68,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
          paddingTop: 2,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: cfg.color,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em',
          }}
        >
          {formatTime(item.minute, item.period)}
        </span>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: `${cfg.color}22`,
            border: `1px solid ${cfg.color}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
          }}
        >
          {cfg.icon}
        </div>
      </div>

      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {item.actor && (
          <span
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: '#F1F5F9',
              marginBottom: 3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.actor}
            {item.team && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.35)',
                  marginLeft: 6,
                }}
              >
                · {item.team}
              </span>
            )}
          </span>
        )}
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.5,
          }}
        >
          {item.message}
        </p>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {item.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: cfg.color,
                  background: `${cfg.color}14`,
                  border: `1px solid ${cfg.color}30`,
                  borderRadius: 6,
                  padding: '2px 7px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
interface CommentaryFeedProps {
  items: Commentary[]
  maxHeight?: number
}

export default function CommentaryFeed({
  items,
  maxHeight = 480,
}: CommentaryFeedProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  // Track previous length to know which entries are "new" from WS push.
  // We compare by sequence so re-renders don't re-flag old entries.
  const prevMaxSequenceRef = useRef<number>(
    items.length > 0 ? Math.max(...items.map((i) => i.sequence)) : 0
  )

  // After first render, update the ref each time items grow
  const newSequenceThreshold = prevMaxSequenceRef.current
  if (items.length > 0) {
    const maxSeq = Math.max(...items.map((i) => i.sequence))
    if (maxSeq > prevMaxSequenceRef.current) {
      prevMaxSequenceRef.current = maxSeq
    }
  }

  // Client-side filter — no refetch, instant
  const filtered = useMemo(() => {
    if (activeFilter === 'all') return items
    return items.filter(
      (item) => getEventConfig(item.eventType).filter === activeFilter
    )
  }, [items, activeFilter])

  // Count per filter for badges
  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: items.length, goals: 0, boundaries: 0, cards: 0 }
    for (const item of items) {
      const f = getEventConfig(item.eventType).filter
      if (f !== 'all') c[f]++
    }
    return c
  }, [items])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{`
        @keyframes cfSlideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cf-slide-in {
          animation: cfSlideDown 0.3s ease forwards;
          background: rgba(255,255,255,0.025);
        }
      `}</style>

      {/* Filter pills */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        {FILTERS.map(({ key, label }) => {
          const isActive = activeFilter === key
          const count = counts[key]
          // Hide filters with 0 matching events (except 'all')
          if (key !== 'all' && count === 0) return null

          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                borderRadius: 999,
                border: isActive
                  ? '1px solid rgba(255,255,255,0.2)'
                  : '1px solid rgba(255,255,255,0.07)',
                background: isActive
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(255,255,255,0.03)',
                color: isActive ? '#F1F5F9' : 'rgba(255,255,255,0.4)',
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: isActive ? '#F1F5F9' : 'rgba(255,255,255,0.25)',
                  background: isActive
                    ? 'rgba(255,255,255,0.15)'
                    : 'rgba(255,255,255,0.06)',
                  borderRadius: 999,
                  padding: '1px 6px',
                  minWidth: 18,
                  textAlign: 'center',
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Feed */}
      <div
        style={{
          overflowY: 'auto',
          maxHeight,
          // Custom scrollbar styling
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: '40px 0',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.2)',
              fontSize: 13,
            }}
          >
            No events yet
          </div>
        ) : (
          filtered.map((item) => (
            <CommentaryRow
              key={`${item.sequence}-${item.id ?? item.sequence}`}
              item={item}
              isNew={item.sequence > newSequenceThreshold}
            />
          ))
        )}
      </div>
    </div>
  )
}