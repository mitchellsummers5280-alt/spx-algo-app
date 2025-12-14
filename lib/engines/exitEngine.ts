// lib/engines/exitEngine.ts

import type { AggregatorContext } from "../aggregator/aggregatorTypes";
import { useSpiceStore } from "../store/spiceStore";
import type { ExitDecision as StoreExitDecision } from "../store/spiceStore";

/**
 * Re-export ExitDecision so existing type imports continue to work.
 */
export type ExitDecision = StoreExitDecision;

// ---- Basic exit parameters (tweak these later as needed) ----
const TAKE_PROFIT_POINTS = 5; // +5 points in your favor
const STOP_LOSS_POINTS = -3; // -3 points against you (pnlPoints <= -3)
const MAX_TRADE_DURATION_MS = 10 * 1000; // 10 seconds (test)

function makeDecision(shouldExit: boolean, reason?: string): ExitDecision {
  return { shouldExit, reason };
}

/**
 * Core EXIT ENGINE
 *
 * Uses:
 * - current price (ctx.price)
 * - current liveTrade from store
 *
 * Exit when:
 * - out of session (if ctx.inNySession is provided and false)
 * - P/L >= TAKE_PROFIT_POINTS
 * - P/L <= STOP_LOSS_POINTS
 * - Trade duration exceeds MAX_TRADE_DURATION_MS
 */
export function runExitEngine(ctx: AggregatorContext): ExitDecision {
  const { liveTrade } = useSpiceStore.getState();

  // No live trade → nothing to exit.
  if (!liveTrade) return makeDecision(false, "No open trade");

  // If your context provides session gating, enforce it here.
  // (Only triggers if you actually have ctx.inNySession defined.)
  const inNySession = (ctx as any)?.inNySession;
  if (inNySession === false) {
    return makeDecision(true, "Session ended (NY gate)");
  }

  // If price is missing or invalid, don't exit on this tick.
  // Use == null to avoid treating 0 as falsy.
  if (ctx.price == null || Number.isNaN(ctx.price)) {
    return makeDecision(false, "No valid price");
  }

  // Raw price difference (SPX points)
  const rawDiff = ctx.price - liveTrade.entryPrice;

  // For CALLS, profit is price - entry
  // For PUTS, profit is entry - price
  const pnlPoints = liveTrade.direction === "CALL" ? rawDiff : -rawDiff;

  // ---- Take Profit ----
  if (pnlPoints >= TAKE_PROFIT_POINTS) {
    return makeDecision(true, `Take profit hit: +${pnlPoints.toFixed(2)} pts`);
  }

  // ---- Stop Loss ----
  if (pnlPoints <= STOP_LOSS_POINTS) {
    return makeDecision(true, `Stop loss hit: ${pnlPoints.toFixed(2)} pts`);
  }

  // ---- Max Time in Trade ----
  const nowMs = (ctx as any)?.nowMs ?? Date.now();
  const ageMs = nowMs - liveTrade.entryTime;

  if (ageMs >= MAX_TRADE_DURATION_MS) {
    return makeDecision(true, "Max trade duration reached");
  }

  // No exit condition met
  return makeDecision(false, "Hold trade");
}

/* -------------------------------------------------------------------------- */
/*  Backwards-compat exports for useExitEngine.ts and any older code          */
/* -------------------------------------------------------------------------- */

export type ExitContext = AggregatorContext;
export type ExitRecommendation = ExitDecision;

export function computeExitRecommendation(ctx: ExitContext): ExitRecommendation {
  return runExitEngine(ctx);
}

// Compatibility export (older aggregator expects this name)
export const evaluateExit = runExitEngine;
