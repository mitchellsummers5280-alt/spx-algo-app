// lib/engines/entryEngine.ts

import type { AggregatorContext } from "../aggregator/aggregatorTypes";
import type { EntryDecision, TradeDirection } from "../store/spiceStore";
import { confirmEntryCandle } from "./entryConfirmation";

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
 * Map confirmation-direction (long/short) to TradeDirection (CALL/PUT)
 */
function toTradeDirection(dir: "long" | "short"): TradeDirection {
  return dir === "long" ? "CALL" : "PUT";
}

/**
 * Helper to build a clean EntryDecision object.
 * Adds optional fields safely (extra fields won't break callers).
 */
function makeDecision(
  shouldEnter: boolean,
  direction?: TradeDirection,
  reason?: string,
  debug?: any,
  action?: "ENTER" | "ARM_ENTRY" | "WAIT" | "NO"
): EntryDecision {
  return {
    shouldEnter,
    direction,
    reason,
    ...(action ? { action } : {}),
    ...(debug ? { debug } : {}),
  } as any;
}

/**
 * Convenience helper for "NO TRADE" decisions.
 * Prevents any accidental `return NO;` style bugs.
 */
function noTrade(reason: string, debug?: any): EntryDecision {
  return makeDecision(false, undefined, reason, debug, "NO");
}

/**
 * Core ENTRY LOGIC (Option A: confirmation candle)
 */
export function runEntryEngine(ctx: AggregatorContext): EntryDecision {
  // NOTE: AggregatorContext typing may lag behind — read these defensively.
  const pendingEntry = (ctx as any).pendingEntry as
    | { direction: "long" | "short"; triggerTime: number }
    | undefined;

  const candles1m = ((ctx as any).candles1m ?? []) as any[];

  // ✅ Step 4.1: Only allow entries during NY session window
  // Debug override: if session tag is "new-york", allow testing even if time-window says false.
  const nyAllowed = ctx.isNYSession === true || ctx.session === "new-york";

  if (!nyAllowed) {
    return noTrade("Outside NY session window", {
      blockedBy: ["outside ny window"],
      isNYSession: ctx.isNYSession,
      session: ctx.session,
      pendingEntry,
      candles1mCount: Array.isArray(candles1m) ? candles1m.length : 0,
    });
  }

  // Basic sanity: if we don't have a price, never enter
  if (ctx.price == null || Number.isNaN(ctx.price)) {
    return noTrade("No valid price", {
      price: ctx.price,
      blockedBy: ["price missing/invalid"],
      pendingEntry,
    });
  }

  const bias = getBias(ctx);

  // ✅ Step 4.2: Trend filter (must have explicit EMA alignment)
  if (ctx.twentyEmaAboveTwoHundred == null) {
    return noTrade("Trend filter: EMAs not ready", {
      price: ctx.price,
      bias,
      twentyEmaAboveTwoHundred: ctx.twentyEmaAboveTwoHundred,
      blockedBy: ["trend filter (ema alignment missing)"],
      pendingEntry,
    });
  }

  const sweptAnyLow = !!(
    ctx.sweptAsiaLow ||
    ctx.sweptLondonLow ||
    (ctx as any).sweptNYLow
  );

  const sweptAnyHigh = !!(
    ctx.sweptAsiaHigh ||
    ctx.sweptLondonHigh ||
    (ctx as any).sweptNYHigh
  );

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
    sweptNYHigh: !!(ctx as any).sweptNYHigh,
    sweptNYLow: !!(ctx as any).sweptNYLow,

    sweptAnyLow,
    sweptAnyHigh,

    pendingEntry,
    candles1mCount: Array.isArray(candles1m) ? candles1m.length : 0,

    // helpful for window debugging
    isNYSession: (ctx as any).isNYSession,
    session: (ctx as any).session,
  };

  // If bias is neutral, we can't act yet
  if (bias === "neutral") {
    return noTrade("Trend undefined (waiting for EMAs)", {
      ...baseDebug,
      blockedBy: ["twentyEmaAboveTwoHundred undefined → neutral bias"],
    });
  }

  // ---------------------------------------------------------
  // OPTION A: If pending entry exists → confirm on 1m candles
  // ---------------------------------------------------------
  if (pendingEntry) {
    const confirmed = confirmEntryCandle(pendingEntry.direction, candles1m);

    if (confirmed) {
      return makeDecision(
        true,
        toTradeDirection(pendingEntry.direction),
        "Confirmation candle validated",
        { ...baseDebug, confirmed: true },
        "ENTER"
      );
    }

    return makeDecision(
      false,
      undefined,
      "Waiting for confirmation candle",
      { ...baseDebug, confirmed: false },
      "WAIT"
    );
  }

  // ---------------------------------------------------------
  // No pending entry: evaluate SETUP; if valid → ARM_ENTRY
  // (do NOT enter immediately)
  // ---------------------------------------------------------

  // ----------------------------
  // BULLISH BIAS ENTRY LOGIC
  // ----------------------------
  if (bias === "bull") {
    // 1) Classic ICT-style long: bullish + sweep of session low
    if (sweptAnyLow && !ctx.atAllTimeHigh) {
      return makeDecision(
        false,
        "CALL",
        "Setup valid — waiting for confirmation candle (bull sweep low)",
        {
          ...baseDebug,
          firedRule: "bull:sweepLow:notATH",
          armDirection: "long",
        },
        "ARM_ENTRY"
      );
    }

    // 2) Breakout continuation: ATH + sweep of highs
    if (ctx.atAllTimeHigh && sweptAnyHigh) {
      return makeDecision(
        false,
        "CALL",
        "Setup valid — waiting for confirmation candle (bull ATH sweep high)",
        {
          ...baseDebug,
          firedRule: "bull:ATH:sweepHigh",
          armDirection: "long",
        },
        "ARM_ENTRY"
      );
    }

    // No valid bullish setup
    return noTrade("No bullish setup", {
      ...baseDebug,
      blockedBy: [
        !sweptAnyLow ? "no low sweep" : null,
        ctx.atAllTimeHigh && !sweptAnyHigh ? "at ATH but no high sweep" : null,
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
        false,
        "PUT",
        "Setup valid — waiting for confirmation candle (bear sweep high)",
        {
          ...baseDebug,
          firedRule: "bear:sweepHigh:notATH",
          armDirection: "short",
        },
        "ARM_ENTRY"
      );
    }

    // 2) Exhaustion / reversal from ATH after sweeping lows
    if (ctx.atAllTimeHigh && sweptAnyLow) {
      return makeDecision(
        false,
        "PUT",
        "Setup valid — waiting for confirmation candle (bear ATH sweep low)",
        {
          ...baseDebug,
          firedRule: "bear:ATH:sweepLow",
          armDirection: "short",
        },
        "ARM_ENTRY"
      );
    }

    // No valid bearish setup
    return noTrade("No bearish setup", {
      ...baseDebug,
      blockedBy: [
        !sweptAnyHigh ? "no high sweep" : null,
        ctx.atAllTimeHigh && !sweptAnyLow ? "at ATH but no low sweep" : null,
      ].filter(Boolean),
    });
  }

  // Fallback
  return noTrade("Fallback NONE", {
    ...baseDebug,
    blockedBy: ["unexpected bias state"],
  });
}

// Compatibility export (older aggregator expects this name)
export const evaluateEntry = runEntryEngine;
