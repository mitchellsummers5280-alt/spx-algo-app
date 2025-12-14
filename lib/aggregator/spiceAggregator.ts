// lib/aggregator/aggregator.ts

import { useSpiceStore } from "@/lib/store/spiceStore";
import { useEngineStore } from "@/lib/store/engineStore";
import { evaluateExit, type ExitDecision } from "@/lib/engines/exitEngine";
import type { LiveTrade } from "@/lib/tradeTypes";
import { computeMultiTimeframeState } from "@/lib/engines/multiTimeframeEngine";
import { runEntryEngine, type EntryDecision } from "@/lib/engines/entryEngine";

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
 * Main SPICE aggregator
 */
export function runAggregator(
  ctx: AggregatorContext,
  source: EngineSource
): EngineSnapshot {
  const notes: string[] = [];

  // 0) Always run Entry Engine (structured decision)
  let entryDecision: EntryDecision | null = null;

  try {
    // ✅ FIX: entryEngine expects AggregatorContext, so pass ctx directly
    const entry = runEntryEngine(ctx);

    // ✅ FIX: actually store the decision we computed
    entryDecision = entry;

    // ✅ PHASE 2 VALIDATION: always publish "why not" info
    const blockedBy: string[] = [];

    if (ctx.price == null || Number.isNaN(ctx.price)) blockedBy.push("price missing/invalid");
    if (ctx.hasOpenTrade) blockedBy.push("already in trade (hasOpenTrade=true)");
    if (!ctx.session) blockedBy.push("session missing");
    if (ctx.twentyEmaAboveTwoHundred == null) blockedBy.push("trend flag undefined (20>200)");
    if (ctx.atAllTimeHigh == null) blockedBy.push("ATH flag undefined");

    // ✅ Include NY sweeps too
    const anySweep =
      !!ctx.sweptAsiaHigh ||
      !!ctx.sweptAsiaLow ||
      !!ctx.sweptLondonHigh ||
      !!ctx.sweptLondonLow ||
      !!ctx.sweptNYHigh ||
      !!ctx.sweptNYLow;

    if (!anySweep) blockedBy.push("no sweep flags true");

    if (!entry?.shouldEnter) blockedBy.push("entryEngine.shouldEnter=false");

    // ✅ Publish full trace (include NY fields so debug JSON can show them)
    useEngineStore.getState().setEntryWhyNot({
      ts: Date.now(),
      evaluated: true,
      price: ctx.price ?? undefined,
      hasOpenTrade: !!ctx.hasOpenTrade,
      blockedBy,

      twentyEmaAboveTwoHundred: ctx.twentyEmaAboveTwoHundred,
      atAllTimeHigh: ctx.atAllTimeHigh,

      sweptAsiaHigh: !!ctx.sweptAsiaHigh,
      sweptAsiaLow: !!ctx.sweptAsiaLow,
      sweptLondonHigh: !!ctx.sweptLondonHigh,
      sweptLondonLow: !!ctx.sweptLondonLow,

      // ✅ NEW
      sweptNYHigh: !!ctx.sweptNYHigh,
      sweptNYLow: !!ctx.sweptNYLow,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[SPICE][EntryEngine]", entryDecision);
    }
  } catch (err) {
    console.error("[SPICE] Error computing entryDecision:", err);

    // ✅ PHASE 2 VALIDATION: publish error state
    try {
      useEngineStore.getState().setEntryWhyNot({
        ts: Date.now(),
        evaluated: false,
        blockedBy: ["entryEngine threw error (see console)"],
      });
    } catch { }
  }

  // 1) If no valid price, stay idle (but we already computed entryDecision)
  const { price } = ctx;
  if (price == null || Number.isNaN(price)) {
    notes.push("No valid price — engine idle.");
    return idleSnapshot(null, source, notes, entryDecision);
  }

  // 2) Determine bias
  const bias = getBias(ctx, notes);

  // 3) Multi-Timeframe Engine
  const mteResult = computeMultiTimeframeState(ctx as any);

  // 4) Entry / Exit *signals* (high-level engine recommendations)
  let entrySignal: EngineEntrySignal | null = null;
  let exitSignal: EngineExitSignal | null = null;

  if (!ctx.hasOpenTrade) {
    entrySignal = getEntrySignal(ctx, bias, notes);
  } else {
    exitSignal = getExitSignal(ctx, bias, notes);
  }

  // 5) Structured exitDecision (Exit Engine reads liveTrade from store)
  let exitDecision: ExitDecision | null = null;

  try {
    const state = useSpiceStore.getState();
    const liveTrade: LiveTrade | null = (state as any).liveTrade ?? null;

    // Only evaluate exits when there’s an open trade
    if (liveTrade && (liveTrade as any).isOpen) {
      const exitCtx = {
        ...ctx,
        nowMs: Date.now(), // deterministic-ish; exitEngine will use ctx.nowMs if present
      } as any;

      exitDecision = evaluateExit(exitCtx);
    }
  } catch (err) {
    console.error("[SPICE] Error computing exitDecision:", err);
  }

  // 6) 🔥 Open a live trade when entryDecision says YES (with cooldown)
  try {
    const stateNow: any = useSpiceStore.getState();
    const lastExitTime = stateNow.lastExitTime ?? 0;
    const COOLDOWN_MS = 30 * 1000;

    const nowMs = (ctx as any)?.nowMs ?? Date.now();
    const inCooldown = nowMs - lastExitTime < COOLDOWN_MS;

    if (inCooldown) {
      notes.push(
        `Cooldown active (${Math.max(
          0,
          Math.ceil((COOLDOWN_MS - (nowMs - lastExitTime)) / 1000)
        )}s left) — skipping entry.`
      );
    }

    if (
      entryDecision &&
      entryDecision.shouldEnter &&
      !ctx.hasOpenTrade &&
      !inCooldown &&
      price != null
    ) {
      console.log("[SPICE] Opening live trade from entry engine:", entryDecision);

      useSpiceStore.setState((state: any) => {
        const newTrade: any = {
          ...(state.liveTrade ?? {}),
          id: state.liveTrade?.id ?? `spice-trade-${nowMs.toString(36)}`,
          direction: entryDecision.direction ?? null,
          entryPrice: price,
          entryTime: nowMs,
          isOpen: true,
        };

        return {
          ...state,
          hasOpenTrade: true,
          liveTrade: newTrade,
        } as any;
      });

      notes.push("Opened live trade from entry engine.");
    }
  } catch (err) {
    console.error("[SPICE] Error opening live trade from entryDecision:", err);
  }

  // 7) 🔥 Close the live trade when exitDecision says to exit (and record lastExitTime)
  try {
    if (exitDecision && ctx.hasOpenTrade && price != null) {
      const ed: any = exitDecision as any;

      const shouldClose =
        ed.shouldExit === true || ed.action === "close" || ed.action === "exit";

      if (shouldClose) {
        console.log("[SPICE] Closing live trade from exit engine:", ed);

        const nowMs = (ctx as any)?.nowMs ?? Date.now();

        useSpiceStore.setState((state: any) => {
          if (!state.liveTrade) return state;

          const updatedTrade: any = {
            ...state.liveTrade,
            isOpen: false,
            exitPrice: price,
            exitTime: nowMs,
            exitReason: ed.reason ?? ed.label ?? "Exit engine requested close.",
          };

          return {
            ...state,
            hasOpenTrade: false,
            liveTrade: updatedTrade,
            lastExitTime: nowMs, // ✅ cooldown anchor
          } as any;
        });

        notes.push("Closed live trade from exit engine.");
      }
    }
  } catch (err) {
    console.error("[SPICE] Error closing live trade from exitDecision:", err);
  }

  return {
    lastPrice: price,
    bias,
    entrySignal,
    exitSignal,
    exitDecision,
    entryDecision,
    mte: mteResult,
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
  notes: string[],
  entryDecision: EntryDecision | null
): EngineSnapshot {
  return {
    lastPrice: price,
    bias: "neutral",
    entrySignal: null,
    exitSignal: null,
    exitDecision: null,
    entryDecision,
    mte: null,
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
// Entry Logic (signal layer)
// -----------------------------

function getEntrySignal(
  ctx: AggregatorContext,
  bias: Bias,
  notes: string[]
): EngineEntrySignal | null {
  if (ctx.newsImpactOn) {
    notes.push("News impact ON → stricter filters for entries.");
  } else {
    notes.push("News impact OFF → ignoring news in entry filters.");
  }

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
// Exit Logic (signal layer)
// -----------------------------

function getExitSignal(
  ctx: AggregatorContext,
  bias: Bias,
  notes: string[]
): EngineExitSignal | null {
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
