import { Router } from 'express'
import { db } from '../db/db.js'
import { matches } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import axios from 'axios'

export const eventsRouter = Router({ mergeParams: true })

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4'
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY

// In-memory cache — finished matches never change, no point re-fetching
// Key: internal match id, Value: { data, cachedAt }
const cache = new Map()
const CACHE_TTL_LIVE = 30_000       // 30s for live matches
const CACHE_TTL_FINISHED = Infinity  // forever for finished matches

function isCacheValid(entry, isFinished) {
  if (!entry) return false
  if (isFinished) return true  // finished matches cached forever
  return Date.now() - entry.cachedAt < CACHE_TTL_LIVE
}

// GET /matches/:id/events
eventsRouter.get('/', async (req, res) => {
  const matchId = Number(req.params.id)
  if (isNaN(matchId)) {
    return res.status(400).json({ error: 'Invalid match ID' })
  }

  try {
    // 1. Look up the match in our DB
    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .limit(1)

    if (!match) {
      return res.status(404).json({ error: 'Match not found' })
    }

    // 2. Only football matches have external events
    if (match.sport !== 'football') {
      return res.status(400).json({ error: 'Events only available for football matches' })
    }

    // 3. externalId for football is "fd-537392" — strip the "fd-" prefix
    if (!match.externalId || !match.externalId.startsWith('fd-')) {
      return res.status(404).json({ error: 'No external data available for this match' })
    }

    const footballId = match.externalId.replace('fd-', '')
    const isFinished = match.status === 'finished'

    // 4. Check cache first
    const cached = cache.get(matchId)
    if (isCacheValid(cached, isFinished)) {
      return res.json({ data: cached.data, cached: true })
    }

    // 5. Fetch from football-data.org
    const { data } = await axios.get(
      `${FOOTBALL_DATA_BASE}/matches/${footballId}`,
      {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY },
        timeout: 8_000,
      }
    )

    // 6. Shape the response — only what the frontend needs
    const result = {
      competition: {
        name: data.competition?.name ?? null,
        emblem: data.competition?.emblem ?? null,
      },
      homeTeam: {
        name: data.homeTeam?.name ?? match.homeTeam,
        shortName: data.homeTeam?.shortName ?? match.homeTeam,
        crest: data.homeTeam?.crest ?? null,
      },
      awayTeam: {
        name: data.awayTeam?.name ?? match.awayTeam,
        shortName: data.awayTeam?.shortName ?? match.awayTeam,
        crest: data.awayTeam?.crest ?? null,
      },
      score: {
        fullTime: data.score?.fullTime ?? { home: null, away: null },
        halfTime: data.score?.halfTime ?? { home: null, away: null },
      },
      goals: (data.goals ?? []).map(g => ({
        minute: g.minute,
        team: g.team?.shortName ?? g.team?.name ?? null,
        scorer: g.scorer?.name ?? null,
        assist: g.assist?.name ?? null,
        type: g.type ?? 'REGULAR',  // REGULAR, OWN_GOAL, PENALTY
      })),
      bookings: (data.bookings ?? []).map(b => ({
        minute: b.minute,
        team: b.team?.shortName ?? b.team?.name ?? null,
        player: b.player?.name ?? null,
        card: b.card,  // 'YELLOW' or 'RED'
      })),
      substitutions: (data.substitutions ?? []).map(s => ({
        minute: s.minute,
        team: s.team?.shortName ?? s.team?.name ?? null,
        playerOut: s.playerOut?.name ?? null,
        playerIn: s.playerIn?.name ?? null,
      })),
    }

    // 7. Cache and return
    cache.set(matchId, { data: result, cachedAt: Date.now() })
    res.json({ data: result, cached: false })

  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Match not found on football-data.org' })
    }
    if (err.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limited — try again shortly' })
    }
    console.error('[events] failed:', err.message)
    res.status(500).json({ error: 'Failed to fetch match events' })
  }
})