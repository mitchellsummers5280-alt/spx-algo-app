// lib/aggregator/aggregator.ts

import { useSpiceStore } from "../store/spiceStore";
import { evaluateExit, type ExitDecision } from "../engines/exitEngine";
import type { LiveTrade } from "../tradeTypes";

import {
  AggregatorContext,
  EngineSnapshot,
  EngineSource,
  Bias,
  EngineEntrySignal,
  EngineExitSignal,
} from "./aggregatorTypes";

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Very simple “rule engine” to start.
 * We’ll refine these rules later as we formalize your playbook.
 */
export function runAggregator(
  ctx: AggregatorContext,
  source: EngineSource
): EngineSnapshot {
  const notes: string[] = [];

  const { price } = ctx;
  if (price == null || Number.isNaN(price)) {
    notes.push("No valid price — engine idle.");
    return idleSnapshot(null, source, notes);
  }

  // 1) Determine bias
  const bias = getBias(ctx, notes);

  // 2) Entry logic (only if no open trade)
  let entrySignal: EngineEntrySignal | null = null;
  let exitSignal: EngineExitSignal | null = null;

  if (!ctx.hasOpenTrade) {
    entrySignal = getEntrySignal(ctx, bias, notes);
  } else {
    exitSignal = getExitSignal(ctx, bias, notes);
  }

  // 3) 🔥 NEW – structured exitDecision using LiveTrade + current context
  let exitDecision: ExitDecision | null = null;

  try {
    const state = useSpiceStore.getState();
    const liveTrade: LiveTrade | null = state.liveTrade ?? null;

    if (liveTrade && liveTrade.isOpen) {
      exitDecision = evaluateExit({
        market: {
          price,
          // you can wire real numeric EMAs later if/when they exist
          ema20: undefined,
          ema200: undefined,
          // map your existing sweep flags into generic “highs / lows swept”
          sweptHighs: ctx.sweptAsiaHigh || ctx.sweptLondonHigh,
          sweptLows: ctx.sweptLondonLow,
        },
        trade: liveTrade,
      });
    }
  } catch (err) {
    console.error("[SPICE] Error computing exitDecision:", err);
  }

  return {
    lastPrice: price,
    bias,
    entrySignal,
    exitSignal,
    exitDecision, // 🔥 NEW field
    debug: {
      source,
      updatedAt: nowIso(),
      notes,
    },
  };
}

function idleSnapshot(
  price: number | null,
  source: EngineSource,
  notes: string[]
): EngineSnapshot {
  return {
    lastPrice: price,
    bias: "neutral",
    entrySignal: null,
    exitSignal: null,
    exitDecision: null, // 🔥 NEW: keep shape consistent
    debug: {
      source,
      updatedAt: nowIso(),
      notes,
    },
  };
}

// -----------------------------
// Bias Logic
// -----------------------------

function getBias(ctx: AggregatorContext, notes: string[]): Bias {
  if (ctx.twentyEmaAboveTwoHundred && !ctx.atAllTimeHigh) {
    notes.push("20 EMA > 200 EMA and not at ATH → long bias.");
    return "long";
  }

  if (!ctx.twentyEmaAboveTwoHundred) {
    notes.push("20 EMA < 200 EMA → short bias.");
    return "short";
  }

  notes.push("No clear trend → neutral bias.");
  return "neutral";
}

// -----------------------------
// Entry Logic
// -----------------------------

function getEntrySignal(
  ctx: AggregatorContext,
  bias: Bias,
  notes: string[]
): EngineEntrySignal | null {
  // News filter: if news impact is ON, be more picky
  if (ctx.newsImpactOn) {
    notes.push("News impact ON → stricter filters for entries.");
  } else {
    notes.push("News impact OFF → ignoring news in entry filters.");
  }

  // Example long idea:
  // - Long bias
  // - Swept London low during NY session (liquidity grab)
  if (
    bias === "long" &&
    ctx.session === "new-york" &&
    ctx.sweptLondonLow &&
    !ctx.atAllTimeHigh
  ) {
    notes.push("NY session + swept London low with long bias → long entry.");
    return {
      direction: "long",
      reason: "NY session long after London low sweep (liquidity grab).",
      time: nowIso(),
    };
  }

  // Example short idea:
  // - Short bias
  // - Swept Asia high or London high in NY
  if (
    bias === "short" &&
    ctx.session === "new-york" &&
    (ctx.sweptAsiaHigh || ctx.sweptLondonHigh)
  ) {
    notes.push(
      "NY session + swept Asia/London high with short bias → short entry."
    );
    return {
      direction: "short",
      reason: "NY session short after Asia/London high sweep.",
      time: nowIso(),
    };
  }

  // If at ATH with long bias and news is OFF, you might still try a breakout.
  if (bias === "long" && ctx.atAllTimeHigh && !ctx.newsImpactOn) {
    notes.push("At ATH with long bias & news OFF → breakout long idea.");
    return {
      direction: "long",
      reason: "Breakout long at ATH with 20 EMA > 200 EMA.",
      time: nowIso(),
    };
  }

  notes.push("No entry conditions met.");
  return null;
}

// -----------------------------
// Exit Logic
// -----------------------------

function getExitSignal(
  ctx: AggregatorContext,
  bias: Bias,
  notes: string[]
): EngineExitSignal | null {
  // Very simple starter logic:
  // - If bias flips against current trade environment → reduce or exit

  if (bias === "neutral") {
    notes.push("Bias neutral while in trade → consider partial reduce.");
    return {
      action: "reduce",
      reason: "Engine bias went neutral while in a trade.",
      time: nowIso(),
    };
  }

  if (ctx.atAllTimeHigh && bias === "short") {
    notes.push("Short bias at ATH while in trade → potential big flush.");
    return {
      action: "hold",
      reason: "Short bias at ATH — allow trade to run.",
      time: nowIso(),
    };
  }

  if (ctx.newsImpactOn && ctx.session === "new-york") {
    notes.push("News ON during NY → tighten risk / consider exit.");
    return {
      action: "reduce",
      reason: "Risk-off due to news sensitivity in NY session.",
      time: nowIso(),
    };
  }

  notes.push("No explicit exit condition met → hold.");
  return {
    action: "hold",
    reason: "No strong exit condition from engine.",
    time: nowIso(),
  };
}
