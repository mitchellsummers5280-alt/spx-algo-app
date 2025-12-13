// lib/store/engineStore.ts
import { create } from "zustand";
import type { EngineSnapshot } from "@/lib/aggregator/aggregatorTypes";

const _initialSnapshot: EngineSnapshot = {
  lastPrice: null,
  bias: "neutral",
  entrySignal: null,
  exitSignal: null,
  entryDecision: { decision: "NONE" }, // ✅ NEW
  exitDecision: null,
  mte: null,
  debug: {
    source: "timer",
    updatedAt: "",
    notes: [],
  },
};

// ✅ PHASE 2 VALIDATION — "why no trades" trace object (separate from EngineSnapshot)
export type EntryWhyNot = {
  ts: number;

  evaluated: boolean;

  price?: number;
  hasOpenTrade?: boolean;

  has1m?: boolean;
  has5m?: boolean;
  has15m?: boolean;

  ema20_1m?: number;
  ema200_1m?: number;
  ema20_5m?: number;
  ema200_5m?: number;

  twentyEmaAboveTwoHundred?: boolean;
  atAllTimeHigh?: boolean;
  sweptAsiaHigh?: boolean;
  sweptAsiaLow?: boolean;
  sweptLondonHigh?: boolean;
  sweptLondonLow?: boolean;

  blockedBy?: string[];
};

type EngineStore = {
  snapshot: EngineSnapshot;
  setSnapshot: (snapshot: EngineSnapshot) => void;
  updateSnapshot: (snapshot: EngineSnapshot) => void;

  // ✅ PHASE 2 VALIDATION
  entryWhyNot?: EntryWhyNot;
  setEntryWhyNot: (x: EntryWhyNot) => void;
};

export const useEngineStore = create<EngineStore>((set) => ({
  snapshot: _initialSnapshot,
  setSnapshot: (snapshot) => set({ snapshot }),
  updateSnapshot: (snapshot) => set({ snapshot }),

  // ✅ PHASE 2 VALIDATION
  entryWhyNot: undefined,
  setEntryWhyNot: (x) => set({ entryWhyNot: x }),
}));
