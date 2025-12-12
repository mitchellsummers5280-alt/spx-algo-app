// lib/engines/livePriceEngine.ts
import { create } from "zustand";

type LivePriceState = {
  last: number | null;
  bid: number | null;
  ask: number | null;
  timestamp: number | null;
  isRunning: boolean;
  start: () => void;
  stop: () => void;
};

export const useLivePriceEngine = create<LivePriceState>((set, get) => ({
  last: null,
  bid: null,
  ask: null,
  timestamp: null,
  isRunning: false,

  start: () => {
    if (get().isRunning) return;
    set({ isRunning: true });

    async function loop() {
      if (!get().isRunning) return;

      try {
        const res = await fetch("/api/polygon/spx");
        const data = await res.json();
        set({
          last: data.last,
          bid: data.bid,
          ask: data.ask,
          timestamp: data.timestamp,
        });
      } catch (e) {
        console.error("Live price fetch error:", e);
      }

      setTimeout(loop, 500); // 2 updates per second
    }

    loop();
  },

  stop: () => set({ isRunning: false }),
}));
