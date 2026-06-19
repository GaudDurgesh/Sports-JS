import { create } from 'zustand'
import type { Sport } from '../types'

type StoreType = {
  activeSport: Sport
  setActiveSport: (sport: Sport) => void
}

export const useSportStore = create<StoreType>()((set) => ({
  activeSport: 'all', // or whatever default Sport value you want
  setActiveSport: (sport) => set({ activeSport: sport }),
}))