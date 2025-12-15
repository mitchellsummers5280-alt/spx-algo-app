// lib/aggregator/aggregator.ts

import { useSpiceStore } from "@/lib/store/spiceStore";
import { useEngineStore } from "@/lib/store/engineStore";
import { evaluateExit, type ExitDecision } from "@/lib/engines/exitEngine";
import type { LiveTrade } from "@/lib/tradeTypes";
import { computeMultiTimeframeState } from "@/lib/engines/multiTimeframeEngine";
import { runEntryEngine, type EntryDecision } from "@/lib/engines/entryEngine";

// ✅ Session Level Engine
import { buildSessionLevels } from "@/lib/engines/sessionLevelEngine";
import { detectSweep } from "@/lib/engines/sessionSweep";

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

  // Grab store helpers (Option A pending-entry)
  const storeNow: any = useSpiceStore.getState();
  const pendingEntry = storeNow.pendingEntry as
    | { direction: "long" | "short"; triggerTime: number }
    | undefined;

  // ================================
  // 0) Session Level Engine (Asia / London / NY)
  // Run BEFORE entry so entry can consume sweep flags
  // ================================
  try {
    const candles1m: any[] =
      (ctx as any).candles1m ??
      (ctx as any).candles?.["1m"] ??
      (ctx as any).series?.["1m"] ??
      [];

    const price =
      typeof (ctx as any).price === "number" && !Number.isNaN((ctx as any).price)
        ? (ctx as any).price
        : null;

    if (price !== null && Array.isArray(candles1m) && candles1m.length > 0) {
      const sessionLevels = buildSessionLevels(
        candles1m as any,
        (ctx as any).sessionLevels
      );

      const asiaSweep = detectSweep(price, sessionLevels.asia);
      const londonSweep = detectSweep(price, sessionLevels.london);
      const nySweep = detectSweep(price, sessionLevels.ny);

      // ✅ keep on ctx (engines use this)
      (ctx as any).sessionLevels = sessionLevels;

      (ctx as any).sweptAsiaHigh = asiaSweep.sweptHigh;
      (ctx as any).sweptAsiaLow = asiaSweep.sweptLow;

      (ctx as any).sweptLondonHigh = londonSweep.sweptHigh;
      (ctx as any).sweptLondonLow = londonSweep.sweptLow;

      (ctx as any).sweptNYHigh = nySweep.sweptHigh;
      (ctx as any).sweptNYLow = nySweep.sweptLow;

      // ✅ ALSO write to spiceStore (your debug UI reads these)
      useSpiceStore.setState({
        // session level highs/lows for UI
        asiaHigh: sessionLevels.asia.high,
        asiaLow: sessionLevels.asia.low,
        londonHigh: sessionLevels.london.high,
        londonLow: sessionLevels.london.low,
        nyHigh: sessionLevels.ny.high,
        nyLow: sessionLevels.ny.low,

        // optional: expose completion flags for UI later
        asiaComplete: sessionLevels.asia.complete,
        londonComplete: sessionLevels.london.complete,
        nyComplete: sessionLevels.ny.complete,

        // sweeps for UI (and consistency)
        sweptAsiaHigh: asiaSweep.sweptHigh,
        sweptAsiaLow: asiaSweep.sweptLow,
        sweptLondonHigh: londonSweep.sweptHigh,
        sweptLondonLow: londonSweep.sweptLow,
        sweptNYHigh: nySweep.sweptHigh,
        sweptNYLow: nySweep.sweptLow,
      } as any);
    } else {
      notes.push("Session levels skipped (missing price or 1m candles).");
    }
  } catch (err) {
    console.error("[SPICE] Session Level Engine error:", err);
    notes.push("Session Level Engine error (see console).");
  }

  // 1) Always run Entry Engine (structured decision)
  let entryDecision: EntryDecision | null = null;

  try {
    // ✅ entryEngine expects AggregatorContext, so pass ctx directly
    // NOTE: ctx.pendingEntry and ctx.candles1m may be read defensively in entryEngine.
    // If your AggregatorContext doesn't include them yet, entryEngine still works.
    const entry = runEntryEngine({
      ...(ctx as any),
      pendingEntry, // ✅ Option A
      // candles1m should come from candleStore in your useSpiceEngine ctx builder.
      // If it isn't present yet, entryEngine will WAIT/NO safely.
    } as any);

    entryDecision = entry;

    // ✅ PHASE 2 VALIDATION: always publish "why not" info
    const blockedBy: string[] = [];

    if (ctx.price == null || Number.isNaN(ctx.price))
      blockedBy.push("price missing/invalid");
    if (ctx.hasOpenTrade) blockedBy.push("already in trade (hasOpenTrade=true)");
    if (!ctx.session) blockedBy.push("session missing");
    if (ctx.twentyEmaAboveTwoHundred == null)
      blockedBy.push("trend flag undefined (20>200)");
    if (ctx.atAllTimeHigh == null) blockedBy.push("ATH flag undefined");

    // ✅ Include NY sweeps too
    const anySweep =
      !!(ctx as any).sweptAsiaHigh ||
      !!(ctx as any).sweptAsiaLow ||
      !!(ctx as any).sweptLondonHigh ||
      !!(ctx as any).sweptLondonLow ||
      !!(ctx as any).sweptNYHigh ||
      !!(ctx as any).sweptNYLow;

    if (!anySweep) blockedBy.push("no sweep flags true");

    // ✅ Option A nuance:
    // - ARM_ENTRY is NOT a "blocked" state; it's "setup found"
    // - WAIT is also not "blocked"; it's "waiting for confirmation"
    const action = (entryDecision as any)?.action as
      | "ENTER"
      | "ARM_ENTRY"
      | "WAIT"
      | "NO"
      | undefined;

    const isTrulyNo =
      action === "NO" ||
      (action == null && entryDecision && (entryDecision as any).shouldEnter === false);

    if (isTrulyNo) blockedBy.push("entryEngine: no setup/blocked");

    // ✅ Publish full trace (include pendingEntry + action)
    useEngineStore.getState().setEntryWhyNot({
      ts: Date.now(),
      evaluated: true,
      price: (ctx as any).price ?? undefined,
      hasOpenTrade: !!(ctx as any).hasOpenTrade,
      blockedBy,

      twentyEmaAboveTwoHundred: (ctx as any).twentyEmaAboveTwoHundred,
      atAllTimeHigh: (ctx as any).atAllTimeHigh,

      sweptAsiaHigh: !!(ctx as any).sweptAsiaHigh,
      sweptAsiaLow: !!(ctx as any).sweptAsiaLow,
      sweptLondonHigh: !!(ctx as any).sweptLondonHigh,
      sweptLondonLow: !!(ctx as any).sweptLondonLow,

      sweptNYHigh: !!(ctx as any).sweptNYHigh,
      sweptNYLow: !!(ctx as any).sweptNYLow,

      // ✅ Option A
      entryAction: action,
      pendingEntry: pendingEntry ?? null,
    } as any);

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

  // 2) If no valid price, stay idle (but we already computed entryDecision)
  const { price } = ctx as any;
  if (price == null || Number.isNaN(price)) {
    notes.push("No valid price — engine idle.");
    return idleSnapshot(null, source, notes, entryDecision);
  }

  // 3) Determine bias
  const bias = getBias(ctx, notes);

  // 4) Multi-Timeframe Engine
  const mteResult = computeMultiTimeframeState(ctx as any);

  // 5) Entry / Exit *signals* (high-level engine recommendations)
  let entrySignal: EngineEntrySignal | null = null;
  let exitSignal: EngineExitSignal | null = null;

  if (!(ctx as any).hasOpenTrade) {
    entrySignal = getEntrySignal(ctx, bias, notes);
  } else {
    exitSignal = getExitSignal(ctx, bias, notes);
  }

  // 6) Structured exitDecision (Exit Engine reads liveTrade from store)
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

  // 7) Option A — handle ARM_ENTRY / WAIT / ENTER with cooldown
  try {
    const stateNow2: any = useSpiceStore.getState();
    const lastExitTime = stateNow2.lastExitTime ?? 0;
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

    const action = (entryDecision as any)?.action as
      | "ENTER"
      | "ARM_ENTRY"
      | "WAIT"
      | "NO"
      | undefined;

    // ✅ ARM_ENTRY: set pending entry (only if not already pending)
    if (
      entryDecision &&
      action === "ARM_ENTRY" &&
      !(ctx as any).hasOpenTrade &&
      !inCooldown &&
      !pendingEntry
    ) {
      const dir =
        (entryDecision as any).direction === "CALL"
          ? "long"
          : (entryDecision as any).direction === "PUT"
            ? "short"
            : null;

      if (dir) {
        const st: any = useSpiceStore.getState();
        if (typeof st.setPendingEntry === "function") {
          st.setPendingEntry({ direction: dir, triggerTime: nowMs });
          notes.push(
            `Armed pending entry (${dir}) — waiting for confirmation candle.`
          );
        } else {
          notes.push("ARM_ENTRY requested but setPendingEntry is missing on store.");
        }
      } else {
        notes.push("ARM_ENTRY requested but entryDecision.direction missing.");
      }
    }

    // ✅ WAIT: do nothing (we're waiting for confirmation)
    if (entryDecision && action === "WAIT") {
      notes.push("Pending entry active — waiting for confirmation candle.");
    }

    // ✅ ENTER: open live trade (only on ENTER)
    if (
      entryDecision &&
      action === "ENTER" &&
      (entryDecision as any).shouldEnter &&
      !(ctx as any).hasOpenTrade &&
      !inCooldown &&
      price != null
    ) {
      console.log("[SPICE] Opening live trade from entry engine:", entryDecision);

      // clear pending entry first
      const st: any = useSpiceStore.getState();
      if (typeof st.clearPendingEntry === "function") st.clearPendingEntry();

      useSpiceStore.setState((state: any) => {
        const newTrade: any = {
          ...(state.liveTrade ?? {}),
          id: state.liveTrade?.id ?? `spice-trade-${nowMs.toString(36)}`,
          direction: (entryDecision as any).direction ?? null,
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

      notes.push("Opened live trade from entry engine (confirmed).");
    }
  } catch (err) {
    console.error("[SPICE] Error handling entryDecision (Option A):", err);
  }

  // 8) 🔥 Close the live trade when exitDecision says to exit (and record lastExitTime)
  try {
    if (exitDecision && (ctx as any).hasOpenTrade && price != null) {
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

        // also clear any pending entry on exit (safety)
        try {
          const st: any = useSpiceStore.getState();
          if (typeof st.clearPendingEntry === "function") st.clearPendingEntry();
        } catch { }

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
  if ((ctx as any).twentyEmaAboveTwoHundred && !(ctx as any).atAllTimeHigh) {
    notes.push("20 EMA > 200 EMA and not at ATH → long bias.");
    return "long";
  }

  if (!(ctx as any).twentyEmaAboveTwoHundred) {
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
  if ((ctx as any).newsImpactOn) {
    notes.push("News impact ON → stricter filters for entries.");
  } else {
    notes.push("News impact OFF → ignoring news in entry filters.");
  }

  if (
    bias === "long" &&
    (ctx as any).session === "new-york" &&
    !!(ctx as any).sweptLondonLow &&
    !(ctx as any).atAllTimeHigh
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
    (ctx as any).session === "new-york" &&
    (!!(ctx as any).sweptAsiaHigh || !!(ctx as any).sweptLondonHigh)
  ) {
    notes.push("NY session + swept Asia/London high with short bias → short entry.");
    return {
      direction: "short",
      reason: "NY session short after Asia/London high sweep.",
      time: nowIso(),
    };
  }

  if (bias === "long" && (ctx as any).atAllTimeHigh && !(ctx as any).newsImpactOn) {
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

  if ((ctx as any).atAllTimeHigh && bias === "short") {
    notes.push("Short bias at ATH while in trade → potential big flush.");
    return {
      action: "hold",
      reason: "Short bias at ATH — allow trade to run.",
      time: nowIso(),
    };
  }

  if ((ctx as any).newsImpactOn && (ctx as any).session === "new-york") {
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
