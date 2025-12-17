// lib/store/spiceStore.ts
import { create } from "zustand";
import type { LiveTrade, SessionTag } from "@/lib/tradeTypes";

export type PendingEntry = {
  direction: "long" | "short";
  triggerTime: number;
};

export type SessionLevels = {
  asiaHigh: number | null;
  asiaLow: number | null;
  londonHigh: number | null;
  londonLow: number | null;
  nyHigh: number | null;
  nyLow: number | null;
  updatedAt?: number | null; // optional timestamp for debugging
};

export type SpiceStoreState = {
  // core market context
  price: number | null;
  session: SessionTag;

  twentyEmaAboveTwoHundred: boolean;
  atAllTimeHigh: boolean;

  // sweep flags (computed by sweep engine)
  sweptAsiaHigh: boolean;
  sweptAsiaLow: boolean;
  sweptLondonHigh: boolean;
  sweptLondonLow: boolean;
  sweptNYHigh: boolean;
  sweptNYLow: boolean;

  // session levels (computed from 1m candles)
  sessionLevels: SessionLevels;

  // (kept for your existing UI + planned toggle)
  newsImpactOn: boolean;

  // NEW — polygon candles (store-level, not candleStore)
  candles: any[];

  // Option A — pending entry (confirmation candle)
  pendingEntry?: PendingEntry;

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
        | "sweptNYHigh"
        | "sweptNYLow"
      >
    >
  ) => void;

  setSessionLevels: (levels: Partial<SessionLevels>) => void;

  setCandles: (candles: any[]) => void;
  setNewsImpactOn: (on: boolean) => void;

  // Option A setters
  setPendingEntry: (p?: PendingEntry) => void;
  clearPendingEntry: () => void;

  // trade lifecycle
  startLiveTrade: (trade: LiveTrade) => void;
  closeTrade: () => void;

  // ✅ debug-safe reset (clears trade no matter what)
  resetTrade: () => void;
};

const DEFAULT_LEVELS: SessionLevels = {
  asiaHigh: null,
  asiaLow: null,
  londonHigh: null,
  londonLow: null,
  nyHigh: null,
  nyLow: null,
  updatedAt: null,
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
  sweptNYHigh: false,
  sweptNYLow: false,

  sessionLevels: DEFAULT_LEVELS,

  newsImpactOn: false,

  // candles
  candles: [],

  // Option A
  pendingEntry: undefined,

  // live trade
  liveTrade: null,
  hasOpenTrade: false,

  // setters
  setPrice: (price) => set({ price }),
  setSession: (session) => set({ session }),

  setMarketContext: (patch) => set(patch),

  setSessionLevels: (levels) =>
    set((state) => ({
      sessionLevels: {
        ...state.sessionLevels,
        ...levels,
        updatedAt: Date.now(),
      },
    })),

  setCandles: (candles) => set({ candles }),
  setNewsImpactOn: (on) => set({ newsImpactOn: on }),

  // Option A setters
  setPendingEntry: (pendingEntry) => set({ pendingEntry }),
  clearPendingEntry: () => set({ pendingEntry: undefined }),

  // trade lifecycle
  startLiveTrade: (trade) => set({ liveTrade: trade, hasOpenTrade: true }),
  closeTrade: () => set({ liveTrade: null, hasOpenTrade: false }),

  // ✅ NEW
  resetTrade: () =>
    set({
      hasOpenTrade: false,
      liveTrade: null,
      pendingEntry: undefined,
    }),
}));

// DEV: expose store in browser console
if (typeof window !== "undefined") {
  (window as any).__SPICE_STORE__ = useSpiceStore;
}
