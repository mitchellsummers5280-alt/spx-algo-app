// lib/spice/engines/engineTypes.ts

/**
 * Generic wrapper for any engine output.
 * Keeps everything timestamped + scored.
 */
export type EngineOutput<T> = {
  /** UNIX ms timestamp of when this engine ran */
  timestamp: number;
  /** Engine-specific payload */
  data: T;
  /** 0–100 confidence score in this output */
  confidence: number;
  /** Optional notes for debugging / UI display */
  notes?: string[];
};

/**
 * Core timeframe set you care about for SPX.
 */
export type Timeframe = "1m" | "3m" | "5m" | "15m" | "30m" | "4h";

/**
 * Trading session buckets.
 */
export type Session = "asia" | "london" | "newYork";

/**
 * Simple directional bias.
 */
export type TrendBias = "bullish" | "bearish" | "neutral";

/**
 * Basic OHLC candle.
 * You can extend later (volume, VWAP, etc.).
 */
export type Candle = {
  timestamp: number; // ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

/**
 * Small helper for a price range.
 */
export type PriceRange = {
  high: number;
  low: number;
};
