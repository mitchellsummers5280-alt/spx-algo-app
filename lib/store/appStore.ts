import { NewsItem } from "./newsTypes";

export const useAppStore = create<AppState>((set) => ({
  // existing state...

  latestNews: [] as NewsItem[],
  isNewsImpactEnabled: true,

  setLatestNews: (items: NewsItem[]) => set({ latestNews: items }),
  toggleNewsImpact: () =>
    set((state) => ({ isNewsImpactEnabled: !state.isNewsImpactEnabled })),
}));
