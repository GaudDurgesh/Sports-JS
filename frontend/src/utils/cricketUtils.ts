import type { Match } from '../types'

export interface CricketInnings {
  label: string
  runs: number
  wickets: number | null
  overs: number | null
}

// ─── resolveTeamName ──────────────────────────────────────────────────────────
// Determines which team an innings belongs to from its label.
//
// Cricbuzz (new): labels are constructed as "<teamName> Inning <n>" —
//   e.g. "India Inning 1". We do a simple startsWith check — exact and fast.
//
// CricAPI (legacy / existing DB rows): labels are "<team> Inning <n>" too
//   but with potential shared-word collisions (e.g. "Women", "Under-19").
//   For those we fall back to unique-word fuzzy matching with shared-word
//   exclusion, then index parity as last resort.
//
// Priority: exact startsWith → unique-word fuzzy → index parity

export function resolveTeamName(
  inn: CricketInnings & { teamId?: number | string },
  index: number,
  match: Match,
): string {
  const home = match.homeTeam
  const away = match.awayTeam
  const label = inn.label ?? ''

  // 1. Exact prefix match (Cricbuzz labels — always works for new data)
  if (label.startsWith(home)) return home
  if (label.startsWith(away)) return away

  // 2. Unique-word fuzzy match (CricAPI legacy labels in existing DB rows)
  //    Strip shared words so "Women", "Under-19" don't cause both teams to match.
  const lbl = label.toLowerCase()
  const allHomeWords = home.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const allAwayWords = away.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const sharedWords  = new Set(allHomeWords.filter(w => allAwayWords.includes(w)))
  const homeWords    = allHomeWords.filter(w => !sharedWords.has(w))
  const awayWords    = allAwayWords.filter(w => !sharedWords.has(w))

  const looksLikeHome = homeWords.length > 0 && homeWords.some(w => lbl.includes(w))
  const looksLikeAway = awayWords.length > 0 && awayWords.some(w => lbl.includes(w))

  if (looksLikeHome && !looksLikeAway) return home
  if (looksLikeAway && !looksLikeHome) return away

  // 3. Index parity — last resort only
  return index % 2 === 0 ? home : away
}