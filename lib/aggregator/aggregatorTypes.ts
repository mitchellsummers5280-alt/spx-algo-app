// lib/aggregator/aggregatorTypes.ts

import type { ExitDecision } from "../engines/exitEngine";

export type EngineSource = "price" | "timer";

export type Bias = "long" | "short" | "neutral";

export type EntryDirection = "long" | "short";

export type ExitAction = "take-profit" | "stop-loss" | "reduce" | "hold";

export type EngineEntrySignal = {
  direction: EntryDirection;
  reason: string;
  time: string; // ISO string
};

export type EngineExitSignal = {
  action: ExitAction;
  reason: string;
  time: string; // ISO string
};

export type EngineSnapshot = {
  lastPrice: number | null;
  bias: Bias;
  entrySignal: EngineEntrySignal | null;
  exitSignal: EngineExitSignal | null;
  exitDecision: ExitDecision | null; // 🔥 NEW
  debug: {
    source: EngineSource;
    updatedAt: string;
    notes: string[];
  };
};

/**
 * What the aggregator needs to make a decision.
 * These fields should line up with what we eventually store in spiceStore.
 */
export type AggregatorContext = {
  price: number | null;
  hasOpenTrade: boolean;

  // Sessions
  session: "asia" | "london" | "new-york" | "off";

  // Trend / structure
  twentyEmaAboveTwoHundred: boolean;
  atAllTimeHigh: boolean;

  // Liquidity sweeps
  sweptAsiaHigh: boolean;
  sweptAsiaLow: boolean;
  sweptLondonHigh: boolean;
  sweptLondonLow: boolean;

  // News toggle
  newsImpactOn: boolean;
};
