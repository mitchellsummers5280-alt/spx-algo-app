// app/spx/debug/page.tsx
"use client";

import { useMemo } from "react";
import { useSpiceStore } from "lib/store/spiceStore";
import { useCandleStore } from "lib/store/candleStore";
import { useSpiceEngine } from "lib/hooks/useSpiceEngine";
import { useEngineStore } from "lib/store/engineStore";
import { useJournalStore } from "lib/store/journalStore";

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
function computeEMAFromCandles(
  candles: any[] | undefined,
  length: number
): number | null {
  if (!candles || candles.length === 0) return null;

  const closes = candles.map((c) => c.close).filter((v: any) => typeof v === "number");
  if (closes.length === 0) return null;

  const k = 2 / (length + 1);
  let ema = closes[0];

  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }

  return ema;
}

export default function Page() {
  // keep SPICE engine running
  useSpiceEngine();

  // 🔹 core SPICE state (one selector per field so Zustand is happy)
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
  const sweptNyHigh = useSpiceStore((s) => s.sweptNyHigh);
  const sweptNyLow = useSpiceStore((s) => s.sweptNyLow);

  const asiaHigh = useSpiceStore((s) => s.asiaHigh);
  const asiaLow = useSpiceStore((s) => s.asiaLow);
  const londonHigh = useSpiceStore((s) => s.londonHigh);
  const londonLow = useSpiceStore((s) => s.londonLow);
  const nyHigh = useSpiceStore((s) => s.nyHigh);
  const nyLow = useSpiceStore((s) => s.nyLow);

  // 🔹 entry engine state
  const entryDecision = useEngineStore((s) => s.entryDecision);
  const lastEntryRunAt = useEngineStore((s) => s.lastEntryRunAt);

  // 🔹 journal
  const logNewTrade = useJournalStore((s) => s.logNewTrade);

  // 🔹 candles (we'll use them for both latest view + tables + EMAs)
  const oneMinCandles = useCandleStore((s) => s.byTimeframe?.["1min"]);
  const fiveMinCandles = useCandleStore((s) => s.byTimeframe?.["5min"]);

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
      label: `Decision: ${entryDecision.shouldEnter ? dir : "NO-TRADE"
        }`,
      reason: entryDecision.reason ?? "No reason provided",
    };
  }, [entryDecision]);

  const trendLabel = twentyEmaAboveTwoHundred
    ? "BULLISH (20 > 200)"
    : "BEARISH (20 < 200)";

  // for tables: newest on top, cap to last ~30 candles
  const oneMinDisplay = useMemo(() => {
    if (!oneMinCandles || oneMinCandles.length === 0) return [];
    return [...oneMinCandles].slice(-30).reverse();
  }, [oneMinCandles]);

  const fiveMinDisplay = useMemo(() => {
    if (!fiveMinCandles || fiveMinCandles.length === 0) return [];
    return [...fiveMinCandles].slice(-30).reverse();
  }, [fiveMinCandles]);

  return (
    <div className="min-h-screen bg-black px-6 py-8 text-zinc-100">
      <h1 className="mb-1 text-2xl font-semibold">SPICE · MTE Debug</h1>
      <p className="mb-4 text-xs text-zinc-500">
        Live view of candles, EMAs, sweeps, trend state, entry engine, and
        manual execution.
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
              Last 1m: O {latestCandle.open.toFixed(2)} · H{" "}
              {latestCandle.high.toFixed(2)} · L{" "}
              {latestCandle.low.toFixed(2)} · C{" "}
              {latestCandle.close.toFixed(2)}
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
        </div>

        {/* Liquidity & extremes */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-zinc-400">
              Liquidity & Extremes
            </span>
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
                  sweptNyHigh
                    ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400"
                    : "rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300"
                }
              >
                High
              </span>{" "}
              <span
                className=
                {sweptNyLow
                  ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400"
                  : "rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300"}
              >
                Low
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ENTRY ENGINE + CURRENT TRADE + SESSION LEVELS */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {/* Entry engine big card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-zinc-400">
              Entry Engine
            </span>
            <span className="text-[10px] text-zinc-500">
              {lastEntryRunAt
                ? `Last engine time: ${formatTime(lastEntryRunAt)}`
                : "No runs yet"}
            </span>
          </div>

          <div className="mt-3 text-sm">
            <div className="text-lg font-semibold">{entrySummary.label}</div>
            <div className="mt-1 text-xs text-zinc-400">
              {entrySummary.reason}
            </div>
          </div>

          {entryDecision?.debug && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-black/60 p-2 text-[10px] text-zinc-400">
              {JSON.stringify(entryDecision.debug, null, 2)}
            </pre>
          )}
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
                      liveTrade.direction === "CALL"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }
                  >
                    {liveTrade.direction}
                  </span>
                </div>
                <div>Opened: {formatTime(liveTrade.openedAt)}</div>
                <div>Entry price: {liveTrade.entryPrice.toFixed(2)}</div>
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
                {asiaHigh ? asiaHigh.toFixed(2) : "—"}
              </span>
              <span className="text-zinc-400">Asia Low</span>
              <span className="text-right">
                {asiaLow ? asiaLow.toFixed(2) : "—"}
              </span>

              <span className="mt-1 text-zinc-400">London High</span>
              <span className="mt-1 text-right">
                {londonHigh ? londonHigh.toFixed(2) : "—"}
              </span>
              <span className="text-zinc-400">London Low</span>
              <span className="text-right">
                {londonLow ? londonLow.toFixed(2) : "—"}
              </span>

              <span className="mt-1 text-zinc-400">NY High</span>
              <span className="mt-1 text-right">
                {nyHigh ? nyHigh.toFixed(2) : "—"}
              </span>
              <span className="text-zinc-400">NY Low</span>
              <span className="text-right">
                {nyLow ? nyLow.toFixed(2) : "—"}
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
            <span>Total: {oneMinCandles?.length ?? 0}</span>
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
                      No candles yet — keep SPICE open for a minute or two.
                    </td>
                  </tr>
                )}
                {oneMinDisplay.map((c: any, idx: number) => (
                  <tr
                    key={idx}
                    className="border-t border-zinc-900/80 hover:bg-zinc-900/40"
                  >
                    <td className="px-2 py-1">
                      {formatShortTime(c.startTime ?? c.t ?? c.time)}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {c.open?.toFixed ? c.open.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {c.high?.toFixed ? c.high.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {c.low?.toFixed ? c.low.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {c.close?.toFixed ? c.close.toFixed(2) : "—"}
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
            <span>Total: {fiveMinCandles?.length ?? 0}</span>
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
                      No candles yet — keep SPICE open for a few minutes.
                    </td>
                  </tr>
                )}
                {fiveMinDisplay.map((c: any, idx: number) => (
                  <tr
                    key={idx}
                    className="border-t border-zinc-900/80 hover:bg-zinc-900/40"
                  >
                    <td className="px-2 py-1">
                      {formatShortTime(c.startTime ?? c.t ?? c.time)}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {c.open?.toFixed ? c.open.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {c.high?.toFixed ? c.high.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {c.low?.toFixed ? c.low.toFixed(2) : "—"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {c.close?.toFixed ? c.close.toFixed(2) : "—"}
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
          When SPICE calls an entry and you actually take that trade on
          Robinhood, click this button to log it into the SPICE journal.
        </p>

        <button
          className="rounded-xl border border-emerald-600 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-600/10"
          onClick={() => {
            // use live price if available, otherwise latest 1m candle close
            const fallbackPrice =
              latestCandle && typeof latestCandle.close === "number"
                ? latestCandle.close
                : undefined;

            let effectivePrice: number | undefined = price ?? fallbackPrice;

            // if still no price, allow manual input so you can test / backfill
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
