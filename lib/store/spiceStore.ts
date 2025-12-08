// lib/store/spiceStore.ts
import { create } from "zustand";
import type { LiveTrade, SessionTag } from "@/lib/tradeTypes";

type SpiceStoreState = {
  // core market context
  price: number | null;
  session: SessionTag;
  twentyEmaAboveTwoHundred: boolean;
  atAllTimeHigh: boolean;
  sweptAsiaHigh: boolean;
  sweptAsiaLow: boolean;
  sweptLondonHigh: boolean;
  sweptLondonLow: boolean;
  newsImpactOn: boolean;

  // live trade
  liveTrade: LiveTrade | null;
  hasOpenTrade: boolean;

  // setters
  setPrice: (price: number) => void;
  setSession: (session: SessionTag) => void;
  setMarketContext: (
    patch: Partial<
      Pick<
        SpiceStoreState,
        | "twentyEmaAboveTwoHundred"
        | "atAllTimeHigh"
        | "sweptAsiaHigh"
        | "sweptAsiaLow"
        | "sweptLondonHigh"
        | "sweptLondonLow"
      >
    >
  ) => void;
  setNewsImpactOn: (on: boolean) => void;

  startLiveTrade: (trade: LiveTrade) => void;
  closeTrade: () => void;
};

export const useSpiceStore = create<SpiceStoreState>((set) => ({
  // defaults
  price: null,
  session: "new_york",
  twentyEmaAboveTwoHundred: false,
  atAllTimeHigh: false,
  sweptAsiaHigh: false,
  sweptAsiaLow: false,
  sweptLondonHigh: false,
  sweptLondonLow: false,
  newsImpactOn: false,

  liveTrade: null,
  hasOpenTrade: false,

  setPrice: (price) => set({ price }),
  setSession: (session) => set({ session }),
  setMarketContext: (patch) => set((state) => ({ ...state, ...patch })),
  setNewsImpactOn: (on) => set({ newsImpactOn: on }),

  startLiveTrade: (trade) =>
    set({
      liveTrade: trade,
      hasOpenTrade: true,
    }),

  closeTrade: () =>
    set({
      liveTrade: null,
      hasOpenTrade: false,
    }),
}));
