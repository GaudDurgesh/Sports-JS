export interface Match {
  id: number
  sport: string
  homeTeam: string
  awayTeam: string
  status: 'scheduled' | 'live' | 'finished'
  startTime: string
  endTime: string
  homeScore: number
  awayScore: number
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface Commentary {
    id: number
  matchId: number
  minute: number
  sequence: number
  period: string
  eventType: string | null           // ← null is possible per data.json
  actor: string | null
  team: string | null
  message: string
  createdAt: string
  metadata?: Record<string, unknown>  // ← add this
  tags?: string[]                     // ← add this
}

export type Sport = 'football' | 'cricket' | 'kabaddi' | 'basketball' | 'all'

export interface ApiResponse<T> {
  data: T
}


export interface CricketInnings {
  label: string
  runs: number
  wickets: number | null
  overs: number | null
}