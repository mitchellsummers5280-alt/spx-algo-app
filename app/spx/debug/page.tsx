// app/spx/debug/page.tsx
"use client";

import { useMemo } from "react";
import { useSpiceStore } from "@/lib/store/spiceStore";
import { useCandleStore } from "@/lib/store/candleStore";
import { useSpiceEngine } from "@/lib/hooks/useSpiceEngine";
import { useEngineStore } from "@/lib/store/engineStore";
import { useJournalStore } from "@/lib/store/journalStore";
import { usePolygonLive } from "@/lib/hooks/usePolygonLive";

function formatTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatShortTime(ms: number | undefined) {
  if (!ms) return "-";
  const d = new Date(ms);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// very simple EMA helper using candle closes
function computeEMAFromCandles(candles: any[] | undefined, length: number) {
  if (!candles || candles.length === 0) return null;

  const closes = candles
    .map((x: any) => x.c ?? x.close)
    .filter((v: any) => typeof v === "number");
  if (closes.length === 0) return null;

  const k = 2 / (length + 1);
  let ema = closes[0];

  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }

  return ema;
}

export default function Page() {
  // keep SPICE engine running (single instance)
  usePolygonLive();
  const { etTime, isNYSession } = useSpiceEngine();

  // 🔹 core SPICE state
  const price = useSpiceStore((s) => s.price);
  const session = useSpiceStore((s) => s.session);
  const hasOpenTrade = useSpiceStore((s) => s.hasOpenTrade);
  const liveTrade = useSpiceStore((s) => s.liveTrade);

  const twentyEmaAboveTwoHundred = useSpiceStore(
    (s) => s.twentyEmaAboveTwoHundred
  );
  const atAllTimeHigh = useSpiceStore((s) => s.atAllTimeHigh);

  const sweptAsiaHigh = useSpiceStore((s) => s.sweptAsiaHigh);
  const sweptAsiaLow = useSpiceStore((s) => s.sweptAsiaLow);
  const sweptLondonHigh = useSpiceStore((s) => s.sweptLondonHigh);
  const sweptLondonLow = useSpiceStore((s) => s.sweptLondonLow);
  const sweptNYHigh = useSpiceStore((s) => (s as any).sweptNYHigh);
  const sweptNYLow = useSpiceStore((s) => (s as any).sweptNYLow);

  const asiaHigh = useSpiceStore((s) => (s as any).asiaHigh);
  const asiaLow = useSpiceStore((s) => (s as any).asiaLow);
  const londonHigh = useSpiceStore((s) => (s as any).londonHigh);
  const londonLow = useSpiceStore((s) => (s as any).londonLow);
  const nyHigh = useSpiceStore((s) => (s as any).nyHigh);
  const nyLow = useSpiceStore((s) => (s as any).nyLow);

  // ✅ this is the only new “must-have” selector for today
  // (it assumes your spiceStore has resetTrade; if not, we’ll add it next)
  const resetTrade = useSpiceStore((s) => (s as any).resetTrade);

  // 🔹 engine snapshot + phase2 trace
  const engineSnapshot = useEngineStore((s) => s.snapshot);
  const entryWhyNot = useEngineStore((s) => s.entryWhyNot);

  // ✅ entry decision comes from engine snapshot
  const entryDecision = engineSnapshot?.entryDecision ?? null;

  // ✅ last updated time comes from snapshot.debug.updatedAt (ISO string)
  const lastUpdatedIso = engineSnapshot?.debug?.updatedAt || "";
  const lastUpdatedMs = lastUpdatedIso ? Date.parse(lastUpdatedIso) : null;

  // 🔹 journal
  const logNewTrade = useJournalStore((s) => s.logNewTrade);

  // ✅ candles
  const oneMinCandles = useCandleStore((s) => s.candlesByTf["1m"]);
  const fiveMinCandles = useCandleStore((s) => s.candlesByTf["5m"]);
  const lastUpdated1m = useCandleStore((s) => s.lastUpdatedByTf["1m"]);
  const lastUpdated5m = useCandleStore((s) => s.lastUpdatedByTf["5m"]);

  const latestCandle =
    oneMinCandles && oneMinCandles.length > 0
      ? oneMinCandles[oneMinCandles.length - 1]
      : undefined;

  // compute EMAs on 5m as primary TF
  const ema20_5m = useMemo(
    () => computeEMAFromCandles(fiveMinCandles, 20),
    [fiveMinCandles]
  );
  const ema200_5m = useMemo(
    () => computeEMAFromCandles(fiveMinCandles, 200),
    [fiveMinCandles]
  );

  const entrySummary = useMemo(() => {
    if (!entryDecision) {
      return {
        label: "Decision: NONE",
        reason: "Engine has not produced a decision yet.",
      };
    }

    const dir =
      entryDecision.direction === "CALL"
        ? "LONG (CALL)"
        : entryDecision.direction === "PUT"
          ? "SHORT (PUT)"
          : "NONE";

    return {
      label: `Decision: ${entryDecision.shouldEnter ? dir : "NO-TRADE"}`,
      reason: entryDecision.reason ?? "No reason provided",
    };
  }, [entryDecision]);

  const trendLabel = twentyEmaAboveTwoHundred
    ? "BULLISH (20 > 200)"
    : "BEARISH (20 < 200)";

  // -------------------------------------------------------
  // ✅ DEBUG CONTROLS (SAFE)
  // -------------------------------------------------------

  const clearSweeps = () => {
    useSpiceStore.setState({
      sweptAsiaHigh: false,
      sweptAsiaLow: false,
      sweptLondonHigh: false,
      sweptLondonLow: false,
      sweptNYHigh: false,
      sweptNYLow: false,
    } as any);
  };

  const forceSweep = (
    which:
      | "londonHigh"
      | "londonLow"
      | "asiaHigh"
      | "asiaLow"
      | "nyHigh"
      | "nyLow"
  ) => {
    clearSweeps();

    if (which === "londonHigh")
      useSpiceStore.setState({ sweptLondonHigh: true } as any);
    if (which === "londonLow")
      useSpiceStore.setState({ sweptLondonLow: true } as any);
    if (which === "asiaHigh")
      useSpiceStore.setState({ sweptAsiaHigh: true } as any);
    if (which === "asiaLow")
      useSpiceStore.setState({ sweptAsiaLow: true } as any);
    if (which === "nyHigh")
      useSpiceStore.setState({ sweptNYHigh: true } as any);
    if (which === "nyLow")
      useSpiceStore.setState({ sweptNYLow: true } as any);
  };

  const setTrend = (bull: boolean) => {
    useSpiceStore.setState({ twentyEmaAboveTwoHundred: bull } as any);
  };

  const setSession = (s: any) => {
    useSpiceStore.setState({ session: s } as any);
  };

  const toggleATH = () => {
    useSpiceStore.setState({ atAllTimeHigh: !atAllTimeHigh } as any);
  };

  // for tables: newest on top, cap to last ~30 candles
  const oneMinDisplay = useMemo(() => {
    if (!oneMinCandles || oneMinCandles.length === 0) return [];
    return [...oneMinCandles].slice(-30).reverse();
  }, [oneMinCandles]);

  const fiveMinDisplay = useMemo(() => {
    if (!fiveMinCandles || fiveMinCandles.length === 0) return [];
    return [...fiveMinCandles].slice(-30).reverse();
  }, [fiveMinCandles]);

  // ✅ robust “opened time” display (some code uses openedAt, some entryTime)
  const liveTradeOpenedMs: number | null =
    (liveTrade as any)?.openedAt ??
    (liveTrade as any)?.entryTime ??
    (liveTrade as any)?.entryAt ??
    null;

  return (
    <div className="min-h-screen bg-black px-6 py-8 text-zinc-100">
      <h1 className="mb-1 text-2xl font-semibold">SPICE · MTE Debug</h1>
      <p className="mb-4 text-xs text-zinc-500">
        Live view of candles, EMAs, sweeps, trend state, entry engine, and manual
        execution.
      </p>

      {/* TOP ROW: price / EMAs / sweeps summary */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {/* SPX price */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-zinc-400">SPX Price</span>
            <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] uppercase text-zinc-300">
              {session ?? "UNKNOWN"}
            </span>
          </div>

          <div className="mt-2 text-3xl font-semibold">
            {price ? price.toFixed(2) : "…"}
          </div>

          {latestCandle && (
            <div className="mt-2 text-xs text-zinc-500">
              Last 1m: O {latestCandle.o.toFixed(2)} · H{" "}
              {latestCandle.h.toFixed(2)} · L {latestCandle.l.toFixed(2)} · C{" "}
              {latestCandle.c.toFixed(2)}
            </div>
          )}
        </div>

        {/* Multi-timeframe EMAs (Primary TF 5m) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-zinc-400">
              Multi-Timeframe EMAs
            </span>
            <span className="text-[10px] uppercase text-zinc-500">
              Primary TF: 5m
            </span>
          </div>

          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <div>
              <div className="text-xs text-zinc-400">20 EMA</div>
              <div className="text-lg font-semibold">
                {ema20_5m != null ? ema20_5m.toFixed(2) : "…"}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-400">200 EMA</div>
              <div className="text-lg font-semibold">
                {ema200_5m != null ? ema200_5m.toFixed(2) : "…"}
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-zinc-400">
            Trend:{" "}
            <span
              className={
                twentyEmaAboveTwoHundred ? "text-emerald-400" : "text-red-400"
              }
            >
              {trendLabel}
            </span>
          </div>

          {/* ✅ quick trend / session / ATH toggles */}
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-100">Session</div>

                  <div className="mt-0.5 text-xs text-zinc-400">
                    Current:{" "}
                    <span className="text-zinc-200">
                      {String(session ?? "UNKNOWN")}
                    </span>
                  </div>

                  {/* ET + NY window */}
                  <div className="mt-1 flex items-center gap-2 text-[11px]">
                    <span className="text-zinc-400">ET:</span>
                    <span className="text-zinc-100">{etTime || "…"}</span>

                    <span
                      className={
                        isNYSession
                          ? "ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase text-emerald-400"
                          : "ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] uppercase text-zinc-300"
                      }
                    >
                      {isNYSession ? "NY WINDOW" : "OFF HOURS"}
                    </span>

                    <span className="ml-1 text-[10px] text-zinc-500">
                      09:30–11:30 ET
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
                    onClick={() =>
                      useSpiceStore.setState({ session: "asia" } as any)
                    }
                  >
                    Force Asia
                  </button>

                  <button
                    type="button"
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
                    onClick={() =>
                      useSpiceStore.setState({ session: "london" } as any)
                    }
                  >
                    Force London
                  </button>

                  <button
                    type="button"
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
                    onClick={() =>
                      useSpiceStore.setState({ session: "new-york" } as any)
                    }
                  >
                    Force New York
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* DEBUG: trend + ATH overrides */}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
              onClick={() => setTrend(true)}
            >
              Force Bull (20 &gt; 200)
            </button>

            <button
              type="button"
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
              onClick={() => setTrend(false)}
            >
              Force Bear (20 &lt; 200)
            </button>

            <button
              type="button"
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900"
              onClick={toggleATH}
            >
              Toggle ATH
            </button>
          </div>


          {/* Liquidity & extremes */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-zinc-400">Liquidity & Extremes</span>
              <span className="text-[10px] uppercase text-zinc-500">
                {atAllTimeHigh ? "At/near ATH" : "Below ATH"}
              </span>
            </div>

            <div className="mt-3 space-y-1 text-[11px]">
              <div>
                Asia:{" "}
                <span
                  className={
                    sweptAsiaHigh
                      ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400"
                      : "rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300"
                  }
                >
                  High
                </span>{" "}
                <span
                  className={
                    sweptAsiaLow
                      ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400"
                      : "rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300"
                  }
                >
                  Low
                </span>
              </div>

              <div>
                London:{" "}
                <span
                  className={
                    sweptLondonHigh
                      ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400"
                      : "rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300"
                  }
                >
                  High
                </span>{" "}
                <span
                  className={
                    sweptLondonLow
                      ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400"
                      : "rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300"
                  }
                >
                  Low
                </span>
              </div>

              <div>
                New York:{" "}
                <span
                  className={
                    sweptNYHigh
                      ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400"
                      : "rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300"
                  }
                >
                  High
                </span>{" "}
                <span
                  className={
                    sweptNYLow
                      ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400"
                      : "rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300"
                  }
                >
                  Low
                </span>
              </div>
            </div>
          </div>

          {/* ✅ DEBUG SWEEP CONTROLS */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-zinc-700 bg-black/40 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-900/40"
              onClick={() => forceSweep("londonHigh")}
            >
              Force London High Sweep
            </button>
            <button
              className="rounded-lg border border-zinc-700 bg-black/40 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-900/40"
              onClick={() => forceSweep("londonLow")}
            >
              Force London Low Sweep
            </button>
            <button
              className="rounded-lg border border-zinc-700 bg-black/40 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-900/40"
              onClick={() => forceSweep("asiaHigh")}
            >
              Force Asia High Sweep
            </button>
            <button
              className="rounded-lg border border-zinc-700 bg-black/40 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-900/40"
              onClick={() => forceSweep("asiaLow")}
            >
              Force Asia Low Sweep
            </button>
            <button
              className="rounded-lg border border-zinc-700 bg-black/40 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-900/40"
              onClick={clearSweeps}
            >
              Clear Sweeps
            </button>

            <button
              className="rounded-lg border border-zinc-700 bg-black/40 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-900/40"
              onClick={() => forceSweep("nyHigh")}
            >
              Force NY High Sweep
            </button>
            <button
              className="rounded-lg border border-zinc-700 bg-black/40 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-900/40"
              onClick={() => forceSweep("nyLow")}
            >
              Force NY Low Sweep
            </button>

            {/* ✅ NEW: RESET TRADE (unsticks “already in trade”) */}
            <button
              className="rounded-lg border border-red-700 bg-black/40 px-2 py-1 text-[11px] text-red-200 hover:bg-red-900/20"
              onClick={() => {
                if (typeof resetTrade === "function") resetTrade();
                else {
                  // fallback safety: clear trade flags directly if store method isn't present
                  useSpiceStore.setState({ liveTrade: null, hasOpenTrade: false } as any);
                }
              }}
            >
              Reset Trade
            </button>
          </div>
        </div>
      </div>

      {/* ENTRY ENGINE + WHY-NOT + CURRENT TRADE + SESSION LEVELS */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {/* Entry engine big card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-zinc-400">Entry Engine</span>
            <span className="text-[10px] text-zinc-500">
              {lastUpdatedMs
                ? `Last engine time: ${formatTime(lastUpdatedMs)}`
                : "No runs yet"}
            </span>
          </div>

          <div className="mt-3 text-sm">
            <div className="text-lg font-semibold">{entrySummary.label}</div>
            <div className="mt-1 text-xs text-zinc-400">{entrySummary.reason}</div>
          </div>

          {entryDecision?.debug && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-black/60 p-2 text-[10px] text-zinc-400">
              {JSON.stringify(entryDecision.debug, null, 2)}
            </pre>
          )}

          {entryDecision?.debug && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-2">
                <div className="text-zinc-400">Bias</div>
                <div className="text-zinc-200">
                  {entryDecision.debug.bias ?? "—"}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-black/30 p-2">
                <div className="text-zinc-400">Trend (20 &gt; 200)</div>
                <div className="text-zinc-200">
                  {String(entryDecision.debug.twentyEmaAboveTwoHundred ?? "—")}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-black/30 p-2">
                <div className="text-zinc-400">ATH Context</div>
                <div className="text-zinc-200">
                  {String(entryDecision.debug.atAllTimeHigh ?? "—")}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-black/30 p-2">
                <div className="text-zinc-400">Session Sweep</div>
                <div className="text-zinc-200">
                  {entryDecision.debug.sweptNYHigh
                    ? "NY High"
                    : entryDecision.debug.sweptNYLow
                      ? "NY Low"
                      : entryDecision.debug.sweptLondonHigh
                        ? "London High"
                        : entryDecision.debug.sweptLondonLow
                          ? "London Low"
                          : entryDecision.debug.sweptAsiaHigh
                            ? "Asia High"
                            : entryDecision.debug.sweptAsiaLow
                              ? "Asia Low"
                              : "None"}
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-xl border border-zinc-800 bg-black/30 p-2">
              <div className="text-zinc-400">Bias</div>
              <div className="text-zinc-200">{entryDecision?.debug?.bias ?? "—"}</div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black/30 p-2">
              <div className="text-zinc-400">Trend (20&gt;200)</div>
              <div className="text-zinc-200">
                {String(entryDecision?.debug?.twentyEmaAboveTwoHundred ?? "—")}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black/30 p-2">
              <div className="text-zinc-400">NY High Sweep</div>
              <div className="text-zinc-200">
                {String(entryDecision?.debug?.sweptNYHigh ?? "—")}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black/30 p-2">
              <div className="text-zinc-400">NY Low Sweep</div>
              <div className="text-zinc-200">
                {String(entryDecision?.debug?.sweptNYLow ?? "—")}
              </div>
            </div>
          </div>

          {/* ✅ PHASE 2 VALIDATION: why no trade */}
          <div className="mt-4 rounded-xl border border-zinc-800 bg-black/30 p-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-zinc-200">
                Why No Trade (Phase 2)
              </div>
              <div className="text-[10px] text-zinc-500">
                {entryWhyNot?.ts ? formatTime(entryWhyNot.ts) : "—"}
              </div>
            </div>

            {!entryWhyNot?.evaluated ? (
              <div className="mt-2 text-[12px] text-zinc-400">
                Entry engine trace not available yet.
              </div>
            ) : entryWhyNot?.blockedBy?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-zinc-300">
                {entryWhyNot.blockedBy.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-[12px] text-emerald-300">
                No blocks — entry is eligible to fire.
              </div>
            )}
          </div>
        </div>

        {/* Current trade + session levels */}
        <div className="space-y-4">
          {/* current trade */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-zinc-400">
                Current Trade
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${hasOpenTrade
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/60"
                  : "bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                  }`}
              >
                {hasOpenTrade ? "Open" : "Flat"}
              </span>
            </div>

            {liveTrade ? (
              <div className="mt-2 text-xs text-zinc-300">
                <div>
                  Direction:{" "}
                  <span
                    className={
                      (liveTrade as any).direction === "CALL"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    {(liveTrade as any).direction ?? "—"}
                  </span>
                </div>
                <div>
                  Opened:{" "}
                  {liveTradeOpenedMs ? formatTime(liveTradeOpenedMs) : "—"}
                </div>
                <div>
                  Entry price:{" "}
                  {typeof (liveTrade as any).entryPrice === "number"
                    ? (liveTrade as any).entryPrice.toFixed(2)
                    : "—"}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-zinc-500">
                No live trade in SPICE store.
              </div>
            )}
          </div>

          {/* session levels */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="mb-2 text-xs uppercase text-zinc-400">
              Session Levels
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-[11px]">
              <span className="text-zinc-400">Asia High</span>
              <span className="text-right">
                {asiaHigh ? Number(asiaHigh).toFixed(2) : "—"}
              </span>
              <span className="text-zinc-400">Asia Low</span>
              <span className="text-right">
                {asiaLow ? Number(asiaLow).toFixed(2) : "—"}
              </span>

              <span className="mt-1 text-zinc-400">London High</span>
              <span className="mt-1 text-right">
                {londonHigh ? Number(londonHigh).toFixed(2) : "—"}
              </span>
              <span className="text-zinc-400">London Low</span>
              <span className="text-right">
                {londonLow ? Number(londonLow).toFixed(2) : "—"}
              </span>

              <span className="mt-1 text-zinc-400">NY High</span>
              <span className="mt-1 text-right">
                {nyHigh ? Number(nyHigh).toFixed(2) : "—"}
              </span>
              <span className="text-zinc-400">NY Low</span>
              <span className="text-right">
                {nyLow ? Number(nyLow).toFixed(2) : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CANDLE TABLES */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {/* 1m candles */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
            <span>1m Candles</span>
            <span>
              Total: {oneMinCandles?.length ?? 0} · Updated:{" "}
              {lastUpdated1m ? formatTime(lastUpdated1m) : "—"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[11px]">
              <thead className="border-b border-zinc-800 text-zinc-500">
                <tr>
                  <th className="px-2 py-1 text-left">Time</th>
                  <th className="px-2 py-1 text-right">O</th>
                  <th className="px-2 py-1 text-right">H</th>
                  <th className="px-2 py-1 text-right">L</th>
                  <th className="px-2 py-1 text-right">C</th>
                </tr>
              </thead>
              <tbody>
                {oneMinDisplay.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-4 text-center text-xs text-zinc-500"
                    >
                      No candles yet — this will populate once ticks call
                      updateFromTick().
                    </td>
                  </tr>
                )}
                {oneMinDisplay.map((c: any, idx: number) => (
                  <tr
                    key={idx}
                    className="border-t border-zinc-900/80 hover:bg-zinc-900/40"
                  >
                    <td className="px-2 py-1">{formatShortTime(c.t)}</td>
                    <td className="px-2 py-1 text-right">
                      {typeof c.o === "number" ? c.o.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {typeof c.h === "number" ? c.h.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {typeof c.l === "number" ? c.l.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {typeof c.c === "number" ? c.c.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5m candles */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
            <span>5m Candles</span>
            <span>
              Total: {fiveMinCandles?.length ?? 0} · Updated:{" "}
              {lastUpdated5m ? formatTime(lastUpdated5m) : "—"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[11px]">
              <thead className="border-b border-zinc-800 text-zinc-500">
                <tr>
                  <th className="px-2 py-1 text-left">Time</th>
                  <th className="px-2 py-1 text-right">O</th>
                  <th className="px-2 py-1 text-right">H</th>
                  <th className="px-2 py-1 text-right">L</th>
                  <th className="px-2 py-1 text-right">C</th>
                </tr>
              </thead>
              <tbody>
                {fiveMinDisplay.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-4 text-center text-xs text-zinc-500"
                    >
                      No candles yet — this will populate once ticks call
                      updateFromTick().
                    </td>
                  </tr>
                )}
                {fiveMinDisplay.map((c: any, idx: number) => (
                  <tr
                    key={idx}
                    className="border-t border-zinc-900/80 hover:bg-zinc-900/40"
                  >
                    <td className="px-2 py-1">{formatShortTime(c.t)}</td>
                    <td className="px-2 py-1 text-right">
                      {typeof c.o === "number" ? c.o.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {typeof c.h === "number" ? c.h.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {typeof c.l === "number" ? c.l.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {typeof c.c === "number" ? c.c.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MANUAL EXECUTION */}
      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="mb-2 text-xs uppercase text-zinc-400">
          Manual Execution
        </div>
        <p className="mb-3 text-xs text-zinc-400">
          When SPICE calls an entry and you actually take that trade on Robinhood,
          click this button to log it into the SPICE journal.
        </p>

        <button
          className="rounded-xl border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-600/10"
          onClick={() => {
            const fallbackPrice =
              latestCandle && typeof latestCandle.c === "number"
                ? latestCandle.c
                : undefined;

            let effectivePrice: number | undefined = price ?? fallbackPrice;

            if (effectivePrice == null) {
              const manualStr = window.prompt(
                "SPICE doesn't have a current price or candle yet.\nEnter the SPX price you want to log for this trade:"
              );
              if (!manualStr) return;

              const manual = parseFloat(manualStr);
              if (Number.isNaN(manual)) {
                alert("That wasn’t a valid number.");
                return;
              }
              effectivePrice = manual;
            }

            const direction =
              entryDecision?.direction === "CALL" ||
                entryDecision?.direction === "PUT"
                ? entryDecision.direction
                : "CALL";

            logNewTrade({
              direction,
              entryPrice: effectivePrice,
              contracts: 1,
              setupTag: entryDecision?.reason ?? "UNKNOWN",
              sessionTag: session ?? "UNKNOWN",
              thesis: `SPICE Entry — ${entryDecision?.reason ?? "no reason detected"
                }`,
            });
          }}
        >
          I took this trade
        </button>
      </div>
    </div>
  );
}