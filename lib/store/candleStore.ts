// lib/store/candleStore.ts
import { create } from "zustand";

export type TimeframeId = "1m" | "3m" | "5m" | "15m" | "30m" | "4h";

export interface Candle {
  /** Start time of the candle (ms since epoch, NY time OK) */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
  /** true when the candle is closed and will never change again */
  closed: boolean;
}

const TIMEFRAME_MS: Record<TimeframeId, number> = {
  "1m": 60_000,
  "3m": 3 * 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "4h": 4 * 60 * 60_000,
};

const MAX_CANDLES = 500;

export interface CandleStoreState {
  candles: Record<TimeframeId, Candle[]>;

  /**
   * Seed historical candles from a REST call (Polygon aggregates).
   * You can call this later once you have proper history endpoints.
   */
  seedHistory: (tf: TimeframeId, raw: Candle[]) => void;

  /**
   * Hybrid tick updater:
   * - If a candle for the current bucket exists, update OHLC.
   * - If bucket changed, close previous candle and start a new one.
   */
  updateFromTick: (price: number, ts?: number) => void;

  getCandles: (tf: TimeframeId) => Candle[];
}

export const useCandleStore = create<CandleStoreState>((set, get) => ({
  candles: {
    "1m": [],
    "3m": [],
    "5m": [],
    "15m": [],
    "30m": [],
    "4h": [],
  },

  seedHistory: (tf, raw) =>
    set((state) => {
      const cloned = [...raw]
        .sort((a, b) => a.t - b.t)
        .slice(-MAX_CANDLES)
        .map((c) => ({ ...c, closed: true }));

      return {
        candles: {
          ...state.candles,
          [tf]: cloned,
        },
      };
    }),

  updateFromTick: (price: number, ts?: number) => {
    const now = typeof ts === "number" ? ts : Date.now();

    set((state) => {
      const updated: Record<TimeframeId, Candle[]> = { ...state.candles };

      (Object.keys(TIMEFRAME_MS) as TimeframeId[]).forEach((tf) => {
        const tfMs = TIMEFRAME_MS[tf];
        const bucketStart = now - (now % tfMs);
        const candles = [...(updated[tf] ?? [])];
        const last = candles[candles.length - 1];

        // No candles yet → start first
        if (!last) {
          candles.push({
            t: bucketStart,
            o: price,
            h: price,
            l: price,
            c: price,
            closed: false,
          });
        } else if (last.t === bucketStart && !last.closed) {
          // Still in the same bucket → update existing open candle
          const merged: Candle = {
            ...last,
            h: Math.max(last.h, price),
            l: Math.min(last.l, price),
            c: price,
          };
          candles[candles.length - 1] = merged;
        } else if (bucketStart > last.t) {
          // New bucket → close previous candle (if not closed) and open new one
          const closedLast: Candle =
            last.closed === true
              ? last
              : {
                  ...last,
                  closed: true,
                };

          candles[candles.length - 1] = closedLast;

          candles.push({
            t: bucketStart,
            o: price,
            h: price,
            l: price,
            c: price,
            closed: false,
          });
        }

        // Trim history
        if (candles.length > MAX_CANDLES) {
          candles.splice(0, candles.length - MAX_CANDLES);
        }

        updated[tf] = candles;
      });

      return { candles: updated };
    });
  },

  getCandles: (tf: TimeframeId) => {
    return get().candles[tf] ?? [];
  },
}));
