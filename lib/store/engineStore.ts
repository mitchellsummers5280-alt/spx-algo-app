// lib/store/engineStore.ts

import { create } from "zustand";
import { EngineSnapshot } from "@/lib/aggregator/aggregatorTypes";

const initialSnapshot: EngineSnapshot = {
  lastPrice: null,
  bias: "neutral",
  entrySignal: null,
  exitSignal: null,
  debug: {
    source: "timer",
    updatedAt: new Date(0).toISOString(),
    notes: ["Engine not run yet."],
  },
};

type EngineStore = {
  snapshot: EngineSnapshot;
  updateSnapshot: (next: EngineSnapshot) => void;
};

export const useEngineStore = create<EngineStore>((set) => ({
  snapshot: initialSnapshot,
  updateSnapshot: (next) => set({ snapshot: next }),
}));
