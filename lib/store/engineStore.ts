import { create } from "zustand";
import type { EngineSnapshot } from "@/lib/aggregator/aggregatorTypes";

const initialSnapshot: EngineSnapshot = {
  lastPrice: null,
  bias: "neutral",
  entrySignal: null,
  exitSignal: null,
  exitDecision: null,
  debug: {
    source: "timer",
    updatedAt: "",
    notes: [],
  },
};

type EngineStore = {
  snapshot: EngineSnapshot;
  setSnapshot: (snapshot: EngineSnapshot) => void;
  updateSnapshot: (snapshot: EngineSnapshot) => void; // ✅ new
};

export const useEngineStore = create<EngineStore>((set) => ({
  snapshot: initialSnapshot,
  setSnapshot: (snapshot) => set({ snapshot }),
  updateSnapshot: (snapshot) => set({ snapshot }), // ✅ alias for now
}));
