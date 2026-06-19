import client from './client'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FootballEvents {
  competition: {
    name: string | null
    emblem: string | null
  }
  homeTeam: {
    name: string
    shortName: string
    crest: string | null
  }
  awayTeam: {
    name: string
    shortName: string
    crest: string | null
  }
  score: {
    fullTime: { home: number | null; away: number | null }
    halfTime: { home: number | null; away: number | null }
  }
  goals: {
    minute: number
    team: string | null
    scorer: string | null
    assist: string | null
    type: string   // 'REGULAR' | 'OWN_GOAL' | 'PENALTY'
  }[]
  bookings: {
    minute: number
    team: string | null
    player: string | null
    card: string   // 'YELLOW' | 'RED'
  }[]
  substitutions: {
    minute: number
    team: string | null
    playerOut: string | null
    playerIn: string | null
  }[]
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────
export async function getMatchEvents(matchId: number): Promise<FootballEvents> {
  const res = await client.get<{ data: FootballEvents }>(`/matches/${matchId}/events`)
  return res.data.data
}