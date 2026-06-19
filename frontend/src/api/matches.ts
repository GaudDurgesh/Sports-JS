import client from './client'
import type { Match, Sport } from '../types'


export const getMatches = async (sport?: Sport): Promise<Match[]> => {
  const { data } = await client.get('/matches', {
    params: sport ? { sport } : {},
  })
  return data.data
}


export const getMatch = async (id: number): Promise<Match> => {
  const { data } = await client.get(`/matches/${id}`)
  return data.data
}


export const createMatch = async (payload: {
  sport: Sport
  homeTeam: string
  awayTeam: string
  startTime: string
  endTime: string
}): Promise<Match> => {
  const { data } = await client.post('/matches', payload)
  return data.data
}


export const updateScore = async (
  id: number,
  homeScore: number,
  awayScore: number
): Promise<Match> => {
  const { data } = await client.put(`/matches/${id}/score`, {
    homeScore,
    awayScore,
  })
  return data.data
}

