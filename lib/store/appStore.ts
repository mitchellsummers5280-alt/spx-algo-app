import { create } from "zustand";
import type { NewsItem } from "../newsTypes";

type AppState = {
  latestNews: NewsItem[];
  isNewsImpactEnabled: boolean;
  setLatestNews: (items: NewsItem[]) => void;
  toggleNewsImpact: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  // initial state
  latestNews: [] as NewsItem[],
  isNewsImpactEnabled: false,

  // actions
  setLatestNews: (items: NewsItem[]) => set({ latestNews: items }),
  toggleNewsImpact: () =>
    set((state) => ({ isNewsImpactEnabled: !state.isNewsImpactEnabled })),
}));

