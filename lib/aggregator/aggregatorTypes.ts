// lib/aggregator/aggregatorTypes.ts

import type { ExitDecision } from "../engines/exitEngine";
import type { EntryDecision } from "../engines/entryEngine";

// Where the snapshot came from (price engine, backtest, etc.)
export type EngineSource = "live" | "replay" | "backtest";

export type Bias = "long" | "short" | "neutral";

export interface EngineEntrySignal {
  direction: "long" | "short";
  reason: string;
  time: string; // ISO
}

export interface EngineExitSignal {
  action: "hold" | "reduce" | "close";
  reason: string;
  time: string; // ISO
}

// You can tighten this later if you have a real type from the MTE
export type MultiTimeframeSnapshot = any;

export interface AggregatorContext {
  // core price + state
  price: number | null;
  hasOpenTrade: boolean;

  // session + bias flags
  session: string | null;

  // ✅ NY session window (Step 4.1)
  isNYSession?: boolean;

  twentyEmaAboveTwoHundred?: boolean | null;
  atAllTimeHigh?: boolean | null;

  // sweeps
  sweptAsiaHigh: boolean;
  sweptAsiaLow: boolean;
  sweptLondonHigh: boolean;
  sweptLondonLow: boolean;
  sweptNYHigh: boolean;
  sweptNYLow: boolean;

  // news toggle
  newsImpactOn: boolean;
}

export interface EngineSnapshot {
  lastPrice: number | null;
  bias: Bias;
  entrySignal: EngineEntrySignal | null;
  exitSignal: EngineExitSignal | null;

  // Structured engines
  exitDecision: ExitDecision | null;
  entryDecision: EntryDecision | null; // 🔥 NEW

  // Multi-Timeframe Engine snapshot
  mte: MultiTimeframeSnapshot | null;

  debug: {
    source: EngineSource;
    updatedAt: string; // ISO
    notes: string[];
  };
}
