// lib/store/spiceStore.ts
import { create } from "zustand";
import type { LiveTrade, SessionTag } from "@/lib/tradeTypes";

export type SpiceStoreState = {
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

  // NEW — polygon candles
  candles: any[];

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

  setCandles: (candles: any[]) => void;
  setNewsImpactOn: (on: boolean) => void;

  startLiveTrade: (trade: LiveTrade) => void;
  closeTrade: () => void;

  // ✅ NEW: debug-safe reset (clears trade no matter what)
  resetTrade: () => void;
};

export const useSpiceStore = create<SpiceStoreState>((set) => ({
  // defaults
  price: null,
  session: "new-york",
  twentyEmaAboveTwoHundred: false,
  atAllTimeHigh: false,
  sweptAsiaHigh: false,
  sweptAsiaLow: false,
  sweptLondonHigh: false,
  sweptLondonLow: false,
  newsImpactOn: false,

  // NEW — polygon candles
  candles: [],

  // live trade
  liveTrade: null,
  hasOpenTrade: false,

  // setters
  setPrice: (price) => set({ price }),
  setSession: (session) => set({ session }),
  setMarketContext: (patch) => set(patch),

  setCandles: (candles) => set({ candles }),
  setNewsImpactOn: (on) => set({ newsImpactOn: on }),

  startLiveTrade: (trade) => set({ liveTrade: trade, hasOpenTrade: true }),
  closeTrade: () => set({ liveTrade: null, hasOpenTrade: false }),

  // ✅ NEW
  resetTrade: () =>
    set({
      hasOpenTrade: false,
      liveTrade: null,
    }),
}));
