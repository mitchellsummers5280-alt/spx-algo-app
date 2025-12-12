// lib/store/engineStore.ts
import { create } from "zustand";
import type { EngineSnapshot } from "@/lib/aggregator/aggregatorTypes";

const _initialSnapshot: EngineSnapshot = {
  lastPrice: null,
  bias: "neutral",
  entrySignal: null,
  exitSignal: null,
  entryDecision: { decision: "NONE" },  // ✅ NEW
  exitDecision: null,
  mte: null,
  debug: {
    source: "timer",
    updatedAt: "",
    notes: [],
  },
};

type EngineStore = {
  snapshot: EngineSnapshot;
  setSnapshot: (snapshot: EngineSnapshot) => void;
  updateSnapshot: (snapshot: EngineSnapshot) => void;
};

export const useEngineStore = create<EngineStore>((set) => ({
  snapshot: _initialSnapshot,
  setSnapshot: (snapshot) => set({ snapshot }),
  updateSnapshot: (snapshot) => set({ snapshot }),
}));
