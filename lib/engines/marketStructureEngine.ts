// lib/spice/engines/marketStructureEngine.ts

import type {
  Candle,
  EngineOutput,
  PriceRange,
  Session,
  Timeframe,
  TrendBias,
} from "./engineTypes";

/**
 * Types specific to the Market Structure Engine.
 */

export type LiquidityType = "buySide" | "sellSide";

export type LiquidityZone = {
  id: string;
  type: LiquidityType;
  /** Level being targeted (e.g., equal highs/lows area). */
  level: number;
  /** How "fresh" or relevant this liquidity is. */
  freshnessScore: number; // 0–100
};

export type FVG = {
  id: string;
  timeframe: Timeframe;
  /** Upper bound of the imbalance zone. */
  high: number;
  /** Lower bound of the imbalance zone. */
  low: number;
  /** Whether price has partially filled this FVG. */
  partiallyFilled: boolean;
};

export type StructureEventType = "BOS" | "CHOCH";

export type StructureEvent = {
  id: string;
  type: StructureEventType;
  direction: TrendBias; // bullish BOS, bearish BOS, etc.
  price: number;
  timestamp: number;
  timeframe: Timeframe;
};

export type MarketStructureInput = {
  /** Candles bucketed by timeframe. */
  candlesByTimeframe: Record<Timeframe, Candle[]>;
  /** Session information. */
  session: Session;
  /** Previous day range (for PDH/PDL logic). */
  previousDayRange?: PriceRange;
  /** Weekly high/low if available. */
  weeklyRange?: PriceRange;
  /** Optional ATR per timeframe. */
  atrByTimeframe?: Partial<Record<Timeframe, number>>;
};

export type MarketStructureOutput = {
  trendBiasByTimeframe: Record<Timeframe, TrendBias>;
  dominantTrend: TrendBias;
  liquidityZones: LiquidityZone[];
  structureEvents: StructureEvent[];
  fairValueGaps: FVG[];
  premiumDiscountZones?: {
    /** Upper 50% of swing (premium). */
    premium: PriceRange;
    /** Lower 50% of swing (discount). */
    discount: PriceRange;
  };
};

/**
 * Main entry point for the Market Structure Engine.
 *
 * You pass in candles + context → you get:
 * - trend bias
 * - BOS / CHOCH events
 * - liquidity zones
 * - FVG map
 */
export function runMarketStructureEngine(
  input: MarketStructureInput
): EngineOutput<MarketStructureOutput> {
  const now = Date.now();

  // TODO: Implement real logic.
  // For now this is a placeholder scaffold that always returns neutral bias.

  const placeholderOutput: MarketStructureOutput = {
    trendBiasByTimeframe: {
      "1m": "neutral",
      "3m": "neutral",
      "5m": "neutral",
      "15m": "neutral",
      "30m": "neutral",
      "4h": "neutral",
    },
    dominantTrend: "neutral",
    liquidityZones: [],
    structureEvents: [],
    fairValueGaps: [],
    premiumDiscountZones: undefined,
  };

  return {
    timestamp: now,
    data: placeholderOutput,
    confidence: 0, // 0 until real logic is wired
    notes: ["MarketStructureEngine: placeholder implementation"],
  };
}
