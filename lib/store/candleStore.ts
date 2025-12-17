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

// ✅ IMPORTANT: 1m needs >= 24h (1440). Give buffer so Asia/London always exist.
// Others can stay smaller.
const MAX_BY_TF: Record<TimeframeId, number> = {
  "1m": 3000,
  "3m": 1200,
  "5m": 1200,
  "15m": 800,
  "30m": 800,
  "4h": 500,
};

function bucketStart(ts: number, tf: TimeframeId) {
  const ms = TIMEFRAME_MS[tf];
  return ts - (ts % ms);
}

function cap<T>(arr: T[], max: number) {
  if (arr.length <= max) return arr;
  return arr.slice(arr.length - max);
}

export interface CandleStoreState {
  // ✅ canonical storage
  candles: Record<TimeframeId, Candle[]>;

  // ✅ compatibility alias (some code expects candlesByTf)
  candlesByTf: Record<TimeframeId, Candle[]>;

  // ✅ debug timestamps
  lastUpdatedByTf: Record<TimeframeId, number | null>;

  /**
   * Seed historical candles from a REST call (Polygon aggregates).
   * Ensures sorted ascending and:
   * - all past candles closed=true
   * - the latest candle is OPEN (closed=false) if it belongs to the current bucket
   */
  seedHistory: (tf: TimeframeId, raw: Candle[]) => void;

  /**
   * Compatibility alias for code that expects setCandles(tf, candles)
   */
  setCandles: (tf: TimeframeId, candles: Candle[]) => void;

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

  // alias starts separate, but we always keep them identical on updates
  candlesByTf: {
    "1m": [],
    "3m": [],
    "5m": [],
    "15m": [],
    "30m": [],
    "4h": [],
  },

  lastUpdatedByTf: {
    "1m": null,
    "3m": null,
    "5m": null,
    "15m": null,
    "30m": null,
    "4h": null,
  },

  seedHistory: (tf, raw) =>
    set((state) => {
      const now = Date.now();
      const curBucket = bucketStart(now, tf);

      // Normalize -> sort -> cap
      const sorted = [...raw].sort((a, b) => a.t - b.t);
      const trimmed = cap(sorted, MAX_BY_TF[tf]);

      // Mark candles closed, but reopen the newest candle IF it is the current bucket
      const cloned = trimmed.map((c) => ({ ...c, closed: true }));
      const last = cloned[cloned.length - 1];

      if (last && last.t === curBucket) {
        // ✅ this allows updateFromTick to update the current minute / bucket candle
        cloned[cloned.length - 1] = { ...last, closed: false };
      }

      const nextCandles: Record<TimeframeId, Candle[]> = {
        ...state.candles,
        [tf]: cloned,
      };

      return {
        candles: nextCandles,
        candlesByTf: nextCandles,
        lastUpdatedByTf: { ...state.lastUpdatedByTf, [tf]: now },
      };
    }),

  setCandles: (tf, candles) => {
    get().seedHistory(tf, candles);
  },

  updateFromTick: (price: number, ts?: number) => {
    const now = typeof ts === "number" ? ts : Date.now();

    set((state) => {
      const updated: Record<TimeframeId, Candle[]> = { ...state.candles };
      const updatedTs: Record<TimeframeId, number | null> = {
        ...state.lastUpdatedByTf,
      };

      (Object.keys(TIMEFRAME_MS) as TimeframeId[]).forEach((tf) => {
        const b = bucketStart(now, tf);
        const candles = [...(updated[tf] ?? [])];
        const last = candles[candles.length - 1];

        if (!last) {
          candles.push({
            t: b,
            o: price,
            h: price,
            l: price,
            c: price,
            closed: false,
          });
          updatedTs[tf] = now;
          updated[tf] = candles;
          return;
        }

        // ✅ If we're still in the same bucket, ALWAYS update (even if it was incorrectly closed)
        if (last.t === b) {
          const reopened = last.closed ? { ...last, closed: false } : last;

          candles[candles.length - 1] = {
            ...reopened,
            h: Math.max(reopened.h, price),
            l: Math.min(reopened.l, price),
            c: price,
          };

          updatedTs[tf] = now;
          updated[tf] = cap(candles, MAX_BY_TF[tf]);
          return;
        }

        // ✅ New bucket started: close last candle, start new open candle
        if (b > last.t) {
          candles[candles.length - 1] = last.closed ? last : { ...last, closed: true };

          candles.push({
            t: b,
            o: price,
            h: price,
            l: price,
            c: price,
            closed: false,
          });

          updatedTs[tf] = now;
          updated[tf] = cap(candles, MAX_BY_TF[tf]);
          return;
        }

        // If b < last.t (out-of-order tick), ignore to keep monotonic series
        updated[tf] = cap(candles, MAX_BY_TF[tf]);
      });

      return {
        candles: updated,
        candlesByTf: updated,
        lastUpdatedByTf: updatedTs,
      };
    });
  },

  getCandles: (tf: TimeframeId) => {
    return get().candles[tf] ?? [];
  },
}));

// DEV: expose store in browser console
if (typeof window !== "undefined") {
  (window as any).__CANDLE_STORE__ = useCandleStore;
}