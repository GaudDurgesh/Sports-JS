import { create } from "zustand";

export type SportFilter = "all" | "cricket" | "football";

interface SportFilterState {
  filter: SportFilter;
  setFilter: (f: SportFilter) => void;
}

export const useSportFilter = create<SportFilterState>((set) => ({
  filter: "all",
  setFilter: (filter) => set({ filter }),
}));
