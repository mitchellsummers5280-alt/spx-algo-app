// app/spx/debug/page.tsx
"use client";

import { useMemo } from "react";
import { useSpiceStore } from "@/lib/store/spiceStore";
import { useCandleStore } from "@/lib/store/candleStore";
import { useSpiceEngine } from "@/lib/hooks/useSpiceEngine";
import { useEngineStore } from "@/lib/store/engineStore";
import { useJournalStore } from "@/lib/store/journalStore";
import { usePolygonLive } from "@/lib/hooks/usePolygonLive";
import { useSessionLevelsStore } from "@/lib/store/sessionLevelsStore";
import { useInstitutionalSessions } from "@/lib/hooks/useInstitutionalSessions";

function getNYParts(ms: number) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const yyyy = get("year")!;
  const mm = get("month")!;
  const dd = get("day")!;
  const hh = Number(get("hour") ?? "0");
  const mi = Number(get("minute") ?? "0");

  return {
    nyDay: `${yyyy}-${mm}-${dd}`,
    minutes: hh * 60 + mi,
  };
}

function computeSpxCashHodLod(oneMinCandles: { t: number; h: number; l: number }[]) {
  if (!oneMinCandles?.length) return { hod: null as number | null, lod: null as number | null };

  const nowNY = getNYParts(Date.now());
  const START = 9 * 60 + 30; // 09:30
  const END = 16 * 60;       // 16:00

  let hod = -Infinity;
  let lod = Infinity;
  let found = 0;

  for (const c of oneMinCandles) {
    if (!c || typeof c.t !== "number") continue;
    const p = getNYParts(c.t);

    if (p.nyDay !== nowNY.nyDay) continue;
    if (p.minutes < START || p.minutes > END) continue;

    if (typeof c.h === "number") hod = Math.max(hod, c.h);
    if (typeof c.l === "number") lod = Math.min(lod, c.l);
    found++;
  }

  if (!found || !Number.isFinite(hod) || !Number.isFinite(lod)) {
    return { hod: null, lod: null };
  }

  return { hod, lod };
}

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
  useInstitutionalSessions();
  const { etTime, isNYSession } = useSpiceEngine();
  const esLevels = useSessionLevelsStore((s) => s.es);

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

  // store fallbacks (if you’ve also written highs/lows into the store)
  const asiaHigh = useSpiceStore((s) => (s as any).asiaHigh);
  const asiaLow = useSpiceStore((s) => (s as any).asiaLow);
  const londonHigh = useSpiceStore((s) => (s as any).londonHigh);
  const londonLow = useSpiceStore((s) => (s as any).londonLow);
  const nyHigh = useSpiceStore((s) => (s as any).nyHigh);
  const nyLow = useSpiceStore((s) => (s as any).nyLow);

  // ✅ this assumes your spiceStore has resetTrade; if not, fallback will clear state directly
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
  const { hod: spxHod, lod: spxLod } = computeSpxCashHodLod(oneMinCandles);
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

  // ✅ Session levels: prefer engine ctx if present, fallback to store fields
  const sessionLevelsFromCtx =
    (engineSnapshot as any)?.ctx?.sessionLevels ??
    (engineSnapshot as any)?.debug?.sessionLevels ??
    null;

  const aHigh = esLevels.asiaHigh ?? sessionLevelsFromCtx?.asia?.high ?? asiaHigh;
  const aLow = esLevels.asiaLow ?? sessionLevelsFromCtx?.asia?.low ?? asiaLow;

  const lHigh = esLevels.londonHigh ?? sessionLevelsFromCtx?.london?.high ?? londonHigh;
  const lLow = esLevels.londonLow ?? sessionLevelsFromCtx?.london?.low ?? londonLow;

  const nHigh = sessionLevelsFromCtx?.ny?.high ?? nyHigh;
  const nLow = sessionLevelsFromCtx?.ny?.low ?? nyLow;

  const aDone =
    typeof esLevels?.asiaHigh === "number" && typeof esLevels?.asiaLow === "number";
  const lDone =
    typeof esLevels?.londonHigh === "number" &&
    typeof esLevels?.londonLow === "number";
  const nDone = !!sessionLevelsFromCtx?.ny?.complete;

  const fmtLevel = (v: any) => (typeof v === "number" ? v.toFixed(2) : "—");

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

          {/* SPX Cash Session HOD / LOD */}
          <div className="mt-3 flex items-center gap-3 text-xs">
            <div className="rounded-full bg-zinc-900/60 px-3 py-1 text-zinc-300">
              <span className="text-zinc-500">HOD</span>{" "}
              <span className="font-medium text-zinc-100">
                {spxHod != null ? spxHod.toFixed(2) : "—"}
              </span>
            </div>

            <div className="rounded-full bg-zinc-900/60 px-3 py-1 text-zinc-300">
              <span className="text-zinc-500">LOD</span>{" "}
              <span className="font-medium text-zinc-100">
                {spxLod != null ? spxLod.toFixed(2) : "—"}
              </span>
            </div>
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
            <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-100">
                    Session
                  </div>

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
          <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
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

            {/* ✅ RESET TRADE */}
            <button
              className="rounded-lg border border-red-700 bg-black/40 px-2 py-1 text-[11px] text-red-200 hover:bg-red-900/20"
              onClick={() => {
                if (typeof resetTrade === "function") resetTrade();
                else {
                  useSpiceStore.setState(
                    { liveTrade: null, hasOpenTrade: false } as any
                  );
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
            <div className="mt-1 text-xs text-zinc-400">
              {entrySummary.reason}
            </div>
          </div>

          {entryDecision?.debug && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-black/60 p-2 text-[10px] text-zinc-400">
              {JSON.stringify(entryDecision.debug, null, 2)}
            </pre>
          )}

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
                {entryWhyNot.blockedBy.map((b: string) => (
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
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase text-zinc-400">Session Levels</div>
              <div className="text-[10px] uppercase text-zinc-500">
                Source: {esLevels?.day ? "ES (Massive)" : sessionLevelsFromCtx ? "engine" : "store"}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-y-1 text-[11px]">
              <span className="text-zinc-400">Asia High</span>
              <span className="text-right font-mono text-zinc-200">
                {fmtLevel(aHigh)}
              </span>
              <span className="text-zinc-400">Asia Low</span>
              <span className="text-right font-mono text-zinc-200">
                {fmtLevel(aLow)}
              </span>

              <span className="mt-1 text-zinc-400">London High</span>
              <span className="mt-1 text-right font-mono text-zinc-200">
                {fmtLevel(lHigh)}
              </span>
              <span className="text-zinc-400">London Low</span>
              <span className="text-right font-mono text-zinc-200">
                {fmtLevel(lLow)}
              </span>

              <span className="mt-1 text-zinc-400">NY High</span>
              <span className="mt-1 text-right font-mono text-zinc-200">
                {fmtLevel(nHigh)}
              </span>
              <span className="text-zinc-400">NY Low</span>
              <span className="text-right font-mono text-zinc-200">
                {fmtLevel(nLow)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
              <span
                className={
                  aDone
                    ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-center text-emerald-400"
                    : "rounded-full bg-zinc-800 px-2 py-0.5 text-center text-zinc-400"
                }
              >
                Asia {aDone ? "complete" : "building"}
              </span>
              <span
                className={
                  lDone
                    ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-center text-emerald-400"
                    : "rounded-full bg-zinc-800 px-2 py-0.5 text-center text-zinc-400"
                }
              >
                London {lDone ? "complete" : "building"}
              </span>
              <span
                className={
                  nDone
                    ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-center text-emerald-400"
                    : "rounded-full bg-zinc-800 px-2 py-0.5 text-center text-zinc-400"
                }
              >
                NY {nDone ? "complete" : "building"}
              </span>
            </div>

            <div className="mt-2 text-[10px] text-zinc-500">
              Confirm: values should appear during each session window.
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
              thesis: `SPICE Entry — ${entryDecision?.reason ?? "no reason detected"}`,
            });
          }}
        >
          I took this trade
        </button>
      </div>
    </div>
  );
}
