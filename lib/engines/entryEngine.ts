// lib/engines/entryEngine.ts

import type { AggregatorContext } from "../aggregator/aggregatorTypes";
import type { EntryDecision, TradeDirection } from "../store/spiceStore";

/**
 * Simple directional bias:
 * - Bullish when 20 EMA is above 200 EMA
 * - Bearish when explicitly false
 * - Neutral when undefined (prevents accidental "bear" before indicators are ready)
 */
function getBias(ctx: AggregatorContext): "bull" | "bear" | "neutral" {
  if (ctx.twentyEmaAboveTwoHundred === true) return "bull";
  if (ctx.twentyEmaAboveTwoHundred === false) return "bear";
  return "neutral";
}

/**
 * Helper to build a clean EntryDecision object.
 * Adds an optional debug payload (safe: extra fields won't break callers).
 */
function makeDecision(
  shouldEnter: boolean,
  direction?: TradeDirection,
  reason?: string,
  debug?: any
): EntryDecision {
  return {
    shouldEnter,
    direction,
    reason,
    // ✅ PHASE 2 VALIDATION: show exactly what the engine saw
    ...(debug ? { debug } : {}),
  } as any;
}

/**
 * Core ENTRY LOGIC
 */
export function runEntryEngine(ctx: AggregatorContext): EntryDecision {
  // Basic sanity: if we don't have a price, never enter
  if (ctx.price == null || Number.isNaN(ctx.price)) {
    return makeDecision(false, undefined, "No valid price", {
      price: ctx.price,
      blockedBy: ["price missing/invalid"],
    });
  }

  const bias = getBias(ctx);

  const sweptAnyLow = !!(ctx.sweptAsiaLow || ctx.sweptLondonLow);
  const sweptAnyHigh = !!(ctx.sweptAsiaHigh || ctx.sweptLondonHigh);

  // ✅ PHASE 2 VALIDATION: core snapshot
  const baseDebug = {
    price: ctx.price,
    bias,
    twentyEmaAboveTwoHundred: ctx.twentyEmaAboveTwoHundred,
    atAllTimeHigh: ctx.atAllTimeHigh,
    sweptAsiaHigh: ctx.sweptAsiaHigh,
    sweptAsiaLow: ctx.sweptAsiaLow,
    sweptLondonHigh: ctx.sweptLondonHigh,
    sweptLondonLow: ctx.sweptLondonLow,
    sweptAnyLow,
    sweptAnyHigh,
  };

  // If bias is neutral, we can't act yet
  if (bias === "neutral") {
    return makeDecision(false, undefined, "Trend undefined (waiting for EMAs)", {
      ...baseDebug,
      blockedBy: ["twentyEmaAboveTwoHundred undefined → neutral bias"],
    });
  }

  // ----------------------------
  // BULLISH BIAS ENTRY LOGIC
  // ----------------------------
  if (bias === "bull") {
    // 1) Classic ICT-style long: bullish + sweep of session low
    if (sweptAnyLow && !ctx.atAllTimeHigh) {
      return makeDecision(
        true,
        "CALL",
        "Bullish bias + liquidity sweep of session low",
        { ...baseDebug, firedRule: "bull:sweepLow:notATH" }
      );
    }

    // 2) Breakout continuation: ATH + sweep of highs
    if (ctx.atAllTimeHigh && sweptAnyHigh) {
      return makeDecision(
        true,
        "CALL",
        "Bullish breakout at all-time high after sweeping session highs",
        { ...baseDebug, firedRule: "bull:ATH:sweepHigh" }
      );
    }

    // No valid bullish setup
    return makeDecision(false, "CALL", "No bullish setup", {
      ...baseDebug,
      blockedBy: [
        !sweptAnyLow ? "no low sweep" : null,
        ctx.atAllTimeHigh ? "at ATH but no high sweep" : null,
      ].filter(Boolean),
    });
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
        "Bearish bias + liquidity sweep of session high",
        { ...baseDebug, firedRule: "bear:sweepHigh:notATH" }
      );
    }

    // 2) Exhaustion / reversal from ATH after sweeping lows
    if (ctx.atAllTimeHigh && sweptAnyLow) {
      return makeDecision(
        true,
        "PUT",
        "Bearish reversal from all-time high after sweeping session lows",
        { ...baseDebug, firedRule: "bear:ATH:sweepLow" }
      );
    }

    // No valid bearish setup
    return makeDecision(false, "PUT", "No bearish setup", {
      ...baseDebug,
      blockedBy: [
        !sweptAnyHigh ? "no high sweep" : null,
        ctx.atAllTimeHigh ? "at ATH but no low sweep" : null,
      ].filter(Boolean),
    });
  }

  // Fallback
  return makeDecision(false, undefined, "Fallback NONE", {
    ...baseDebug,
    blockedBy: ["unexpected bias state"],
  });
}

// Compatibility export (older aggregator expects this name)
export const evaluateEntry = runEntryEngine;
