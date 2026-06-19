import client from './client'
import type { Commentary } from '../types'

export async function getCommentary(
  matchId: number,
  limit = 50
): Promise<Commentary[]> {
  const { data } = await client.get(`/matches/${matchId}/commentary`, {
    params: { limit },
  })

  const items: Commentary[] = data.data ?? []

  // Always return newest-first regardless of what backend sends
  return items.sort((a, b) => b.sequence - a.sequence)
}