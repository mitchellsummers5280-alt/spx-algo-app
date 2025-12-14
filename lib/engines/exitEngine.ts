// lib/engines/exitEngine.ts

import type { AggregatorContext } from "../aggregator/aggregatorTypes";
import { useSpiceStore } from "../store/spiceStore";
import type { ExitDecision as StoreExitDecision } from "../store/spiceStore";

/**
 * Re-export ExitDecision so existing type imports
 * like `import type { ExitDecision } from "../engines/exitEngine";`
 * continue to work.
 */
export type ExitDecision = StoreExitDecision;

// ---- Basic exit parameters (tweak these later as needed) ----
const TAKE_PROFIT_POINTS = 5; // +5 points in your favor
const STOP_LOSS_POINTS = -3; // -3 points against you (pnlPoints <= -3)

// ✅ IMPORTANT: put this back to 15m for real trading.
// Leave 10s only for testing.
const MAX_TRADE_DURATION_MS = 10 * 1000; // 10 seconds (test)

/** Helper to normalize return */
function makeDecision(shouldExit: boolean, reason?: string): ExitDecision {
  return { shouldExit, reason };
}

/**
 * Core EXIT ENGINE
 *
 * Uses:
 * - current price (ctx.price)
 * - current liveTrade from store
 * - trend flag (ctx.twentyEmaAboveTwoHundred) for bias-flip exit
 *
 * Exit when:
 * - session ended (if ctx.isNYSession is provided and false)
 * - P/L >= TAKE_PROFIT_POINTS
 * - P/L <= STOP_LOSS_POINTS
 * - Trend flips against position (Option B v2)
 * - Trade duration exceeds MAX_TRADE_DURATION_MS
 */
export function runExitEngine(ctx: AggregatorContext): ExitDecision {
  const { liveTrade } = useSpiceStore.getState();

  // No live trade → nothing to exit.
  if (!liveTrade) return makeDecision(false, "No open trade");

  // Session gating (prefer ctx.isNYSession, fallback to older inNySession)
  const isNYSession =
    (ctx as any)?.isNYSession ?? (ctx as any)?.inNySession ?? undefined;

  if (isNYSession === false) {
    return makeDecision(true, "Session ended (NY gate)");
  }

  // If price is missing or invalid, don't exit on this tick.
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

  // ---- Option B v2: Bias Flip Exit ----
  // twentyEmaAboveTwoHundred: true=bullish, false=bearish, null/undefined=unknown
  if (ctx.twentyEmaAboveTwoHundred != null) {
    const bullish = ctx.twentyEmaAboveTwoHundred === true;
    const bearish = ctx.twentyEmaAboveTwoHundred === false;

    if (liveTrade.direction === "CALL" && bearish) {
      return makeDecision(true, "Trend flipped bearish against CALL");
    }

    if (liveTrade.direction === "PUT" && bullish) {
      return makeDecision(true, "Trend flipped bullish against PUT");
    }
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
