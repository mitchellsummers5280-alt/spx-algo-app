// lib/engines/entryEngine.ts

import type { AggregatorContext } from "../aggregator/aggregatorTypes";
import type { EntryDecision, TradeDirection } from "../store/spiceStore";

/**
 * Simple directional bias:
 * - Bullish when 20 EMA is above 200 EMA
 * - Bearish otherwise
 */
function getBias(ctx: AggregatorContext): "bull" | "bear" | "neutral" {
  if (ctx.twentyEmaAboveTwoHundred) return "bull";
  return "bear";
}

/**
 * Helper to build a clean EntryDecision object.
 */
function makeDecision(
  shouldEnter: boolean,
  direction?: TradeDirection,
  reason?: string
): EntryDecision {
  return {
    shouldEnter,
    direction,
    reason,
  };
}

/**
 * Core ENTRY LOGIC
 *
 * High-level idea:
 * - Use EMA relationship for bias (bull vs bear)
 * - Use session liquidity sweeps for precise entries
 * - Use ATH to distinguish between breakout vs exhaustion style entries
 *
 * CALL examples:
 *  - Bullish bias + sweep of Asia/London low → CALL (long from liquidity)
 *  - Bullish + ATH + sweep of highs → breakout continuation CALL
 *
 * PUT examples:
 *  - Bearish bias + sweep of Asia/London high → PUT (short from liquidity)
 *  - Bearish + ATH + sweep of lows → exhaustion / reversal PUT
 */
export function runEntryEngine(ctx: AggregatorContext): EntryDecision {
  // Basic sanity: if we don't have a price, never enter
  if (!ctx.price || Number.isNaN(ctx.price)) {
    return makeDecision(false);
  }

  const bias = getBias(ctx);

  const sweptAnyLow = ctx.sweptAsiaLow || ctx.sweptLondonLow;
  const sweptAnyHigh = ctx.sweptAsiaHigh || ctx.sweptLondonHigh;

  // ----------------------------
  // BULLISH BIAS ENTRY LOGIC
  // ----------------------------
  if (bias === "bull") {
    // 1) Classic ICT-style long: bullish + sweep of session low
    if (sweptAnyLow && !ctx.atAllTimeHigh) {
      return makeDecision(
        true,
        "CALL",
        "Bullish bias + liquidity sweep of session low"
      );
    }

    // 2) Breakout continuation: ATH + sweep of highs
    if (ctx.atAllTimeHigh && sweptAnyHigh) {
      return makeDecision(
        true,
        "CALL",
        "Bullish breakout at all-time high after sweeping session highs"
      );
    }

    // No valid bullish setup
    return makeDecision(false, "CALL", "No bullish setup");
  }

  // ----------------------------
  // BEARISH BIAS ENTRY LOGIC
  // ----------------------------
  if (bias === "bear") {
    // 1) Short from liquidity: bearish + sweep of session high
    if (sweptAnyHigh && !ctx.atAllTimeHigh) {
      return makeDecision(
        true,
        "PUT",
        "Bearish bias + liquidity sweep of session high"
      );
    }

    // 2) Exhaustion / reversal from ATH after sweeping lows
    if (ctx.atAllTimeHigh && sweptAnyLow) {
      return makeDecision(
        true,
        "PUT",
        "Bearish reversal from all-time high after sweeping session lows"
      );
    }

    // No valid bearish setup
    return makeDecision(false, "PUT", "No bearish setup");
  }

  // Fallback (shouldn't really hit with current bias logic)
  return makeDecision(false);
}
