// lib/spice/engines/signalEngine.ts

import type { EngineOutput, Session, Timeframe } from "./engineTypes";
import type { MarketStructureOutput } from "./marketStructureEngine";

/**
 * Types specific to the Signal (Entry) Engine.
 */

export type SignalDirection = "long" | "short";

export type SignalType =
  | "liquiditySweepReversal"
  | "trendContinuation"
  | "emaBounce"
  | "fvgEntry"
  | "other";

export type SignalSource = {
  /** Which timeframe produced the core signal. */
  timeframe: Timeframe;
  /** Optional reference to a structure event ID, FVG ID, liquidity zone ID, etc. */
  relatedIds?: string[];
};

export type EntryZone = {
  /** Preferred entry price (e.g., limit). */
  ideal: number;
  /** A soft band where entries are acceptable. */
  zoneHigh: number;
  zoneLow: number;
};

export type StopLoss = {
  level: number;
  rationale?: string;
};

export type TakeProfitLevel = {
  level: number;
  rationale?: string;
};

export type SignalEngineInput = {
  /** Result from the Market Structure Engine. */
  marketStructure: MarketStructureOutput;
  /** Current session context. */
  session: Session;
  /** Current last price of the underlying. */
  currentPrice: number;
  /** EMA values by timeframe. Fill as you wire your EMA calc. */
  ema20ByTimeframe?: Partial<Record<Timeframe, number>>;
  ema200ByTimeframe?: Partial<Record<Timeframe, number>>;
};

export type EntrySignal = {
  id: string;
  direction: SignalDirection;
  type: SignalType;
  source: SignalSource;
  entryZone: EntryZone;
  stopLoss: StopLoss;
  takeProfits: TakeProfitLevel[];
  /** 0–100 probability-like measure (internal, not risk). */
  internalScore: number;
};

export type SignalEngineOutput = {
  /** All signals detected at this moment. */
  signals: EntrySignal[];
  /** Signal SPICE considers the best candidate. */
  primarySignal?: EntrySignal;
};

/**
 * Main Signal Engine runner.
 *
 * It consumes market structure + basic indicators and outputs
 * one or more potential entries, plus a "primary" one.
 */
export function runSignalEngine(
  input: SignalEngineInput
): EngineOutput<SignalEngineOutput> {
  const now = Date.now();

  // TODO: Replace this with real logic using:
  // - input.marketStructure.dominantTrend
  // - liquidity sweeps, FVGs, etc.
  // - EMA 20/200 relationships
  // - session context

  const placeholderPrimarySignal: EntrySignal = {
    id: `signal-${now}`,
    direction: "long",
    type: "other",
    source: {
      timeframe: "5m",
      relatedIds: [],
    },
    entryZone: {
      ideal: input.currentPrice,
      zoneHigh: input.currentPrice,
      zoneLow: input.currentPrice,
    },
    stopLoss: {
      level: input.currentPrice - 5,
      rationale: "Placeholder stop; replace with structure-based level.",
    },
    takeProfits: [
      {
        level: input.currentPrice + 5,
        rationale: "Placeholder TP; replace with liquidity/FVG-based target.",
      },
    ],
    internalScore: 0,
  };

  const data: SignalEngineOutput = {
    signals: [placeholderPrimarySignal],
    primarySignal: placeholderPrimarySignal,
  };

  return {
    timestamp: now,
    data,
    confidence: 0,
    notes: ["SignalEngine: placeholder implementation"],
  };
}
