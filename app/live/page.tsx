// app/live/page.tsx
"use client";

import { ConnectBrokerButton } from "@/components/broker/ConnectBrokerButton";

// inside your JSX, maybe near the page title:
<div className="flex items-center justify-between">
  <h1 className="text-lg font-semibold text-slate-100">SPICE Live</h1>
  <ConnectBrokerButton />
</div>

import { useEffect, useState } from "react";
import LiveTradeInput from "@/components/live/LiveTradeInput";
import { useSpiceEngine } from "@/lib/hooks/useSpiceEngine";
import { useEngineStore } from "@/lib/store/engineStore";
import { useSpiceStore } from "@/lib/store/spiceStore";
import { useJournalStore } from "@/lib/store/journalStore";
import type { JournalEntry } from "@/lib/journal/journalTypes";

import { useExitEngine, type LiveExitInput } from "@/lib/hooks/useExitEngine";
import { ExitRecommendationPanel } from "@/components/live/ExitRecommendationPanel";

export default function LivePage() {
  // 🔁 start engine loop (runs every second)
  useSpiceEngine();

  // Engine snapshot + signals
  const snapshot = useEngineStore((s) => s.snapshot);
  const exitDecision = snapshot?.exitDecision;
  const entrySignal = snapshot?.entrySignal;
  const exitSignal = snapshot?.exitSignal;

  // Price + live trade state
  const price = useSpiceStore((s) => s.price);
  const setPrice = useSpiceStore((s) => s.setPrice);
  const liveTrade = useSpiceStore((s) => s.liveTrade);
  const hasOpenTrade = useSpiceStore((s) => s.hasOpenTrade);
  const closeTrade = useSpiceStore((s) => s.closeTrade);

  // Journal store
  const addEntry = useJournalStore((s) => s.addEntry);

  // Local UI state
  const [mockPriceInput, setMockPriceInput] = useState<string>("");
  const [isSimOn, setIsSimOn] = useState(false);

  // 🧱 New: risk config for the current live trade
  const [stopLossInput, setStopLossInput] = useState<string>("");
  const [takeProfitInput, setTakeProfitInput] = useState<string>("");
  const [maxHoldMinutesInput, setMaxHoldMinutesInput] = useState<string>("");

  // Manual price update from input
  const handleUpdatePrice = () => {
    const val = parseFloat(mockPriceInput);
    if (!Number.isNaN(val)) {
      setPrice(val);
    }
  };

  // 📓 Close current trade and log it to the journal
  const handleCloseAndLog = () => {
    if (!liveTrade || !hasOpenTrade) return;

    const lastPrice = price ?? snapshot?.lastPrice ?? null;
    if (lastPrice == null) {
      // If for some reason we don't have a price, don't log a broken trade.
      return;
    }

    const closedAt = new Date().toISOString();

    // Normalize direction for P/L + journal
    const dirStr = String(liveTrade.direction).toLowerCase();

    // Treat CALL / long as long, PUT / short as short
    const isLongDirection = dirStr === "call" || dirStr === "long";
    const journalDirection: "long" | "short" =
      dirStr === "put" || dirStr === "short" ? "short" : "long";

    const pnlPoints = isLongDirection
      ? lastPrice - liveTrade.entryPrice
      : liveTrade.entryPrice - lastPrice;

    const result: JournalEntry["result"] =
      pnlPoints > 0 ? "win" : pnlPoints < 0 ? "loss" : "breakeven";

    const contracts =
      (liveTrade as any).contracts !== undefined
        ? Number((liveTrade as any).contracts)
        : 1;

    const entry: JournalEntry = {
      id: closedAt,
      symbol: liveTrade.symbol,
      direction: journalDirection, // ✅ now matches JournalEntry type
      entryPrice: liveTrade.entryPrice,
      exitPrice: lastPrice,
      contracts:
        (liveTrade as any).contracts !== undefined
          ? Number((liveTrade as any).contracts)
          : 1,
      openedAt: liveTrade.openedAt,
      closedAt,
      notes: liveTrade.notes ?? "",
      pnlPoints,
      result,
    };

    addEntry(entry);
    closeTrade();
  };

  // 🔁 Simple auto-price simulator (random walk around current price)
  useEffect(() => {
    if (!isSimOn) return;

    const id = window.setInterval(() => {
      const state = useSpiceStore.getState();

      const base =
        typeof state.price === "number"
          ? state.price
          : snapshot?.lastPrice ?? 5000;

      const delta = (Math.random() - 0.5) * 4; // move ~±2 pts
      const next = Number((base + delta).toFixed(2));

      state.setPrice(next);
    }, 800);

    return () => window.clearInterval(id);
  }, [isSimOn, snapshot?.lastPrice]);

  // 🔢 Parse risk inputs as numbers (undefined if empty/invalid)
  const slNum = parseFloat(stopLossInput);
  const tpNum = parseFloat(takeProfitInput);
  const maxHoldNum = parseFloat(maxHoldMinutesInput);

  const parsedStopLoss =
    Number.isFinite(slNum) && slNum > 0 ? slNum : undefined;
  const parsedTakeProfit =
    Number.isFinite(tpNum) && tpNum > 0 ? tpNum : undefined;
  const parsedMaxHoldMinutes =
    Number.isFinite(maxHoldNum) && maxHoldNum > 0 ? maxHoldNum : undefined;

  // 🧠 Build Exit Engine input from the live trade + price + risk config
  const directionStr: string | null = liveTrade
    ? String(liveTrade.direction).toLowerCase()
    : null;

  const contractsForLabel =
    liveTrade && (liveTrade as any).contracts !== undefined
      ? Number((liveTrade as any).contracts)
      : 1;

  const exitInput: LiveExitInput | null = liveTrade
    ? {
      entryPrice: liveTrade.entryPrice,
      currentPrice:
        derivedPremium ??
        (typeof price === "number"
          ? price
          : snapshot?.lastPrice ?? liveTrade.entryPrice),
      isLong: directionStr === "call" || directionStr === "long",
      stopLoss: parsedStopLoss,
      target: parsedTakeProfit,
      scaleOutLevel: undefined,
      maxHoldMinutes: parsedMaxHoldMinutes,
      openedAt:
        typeof liveTrade.openedAt === "string"
          ? new Date(liveTrade.openedAt).getTime()
          : (liveTrade.openedAt as number),
      label: `${liveTrade.symbol} x${contractsForLabel} (${liveTrade.direction})`,
    }
    : null;

  // 🧠 Exit Engine recommendation (updates every second)
  const exitRecommendation = useExitEngine(exitInput);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold text-slate-100">SPICE Live</h1>

      <section className="grid gap-4 md:grid-cols-2">
        {/* Left: Live trade input */}
        <LiveTradeInput />

        {/* Right: Engine snapshot + mock price + risk + exit suggestion */}
        <div className="space-y-4 rounded-xl border border-slate-800 bg-black/60 p-4">
          {/* Snapshot stats */}
          <div className="space-y-1 text-xs text-slate-300">
            <p>
              <span className="font-semibold">Last price:</span>{" "}
              {price ?? snapshot?.lastPrice ?? "—"}
            </p>
            <p>
              <span className="font-semibold">Bias:</span>{" "}
              {snapshot?.bias ?? "neutral"}
            </p>

            {entrySignal && (
              <p>
                <span className="font-semibold">Entry signal:</span>{" "}
                {entrySignal.direction} – {entrySignal.reason}
              </p>
            )}

            {exitSignal && (
              <p>
                <span className="font-semibold">Engine exit action:</span>{" "}
                {exitSignal.action} – {exitSignal.reason}
              </p>
            )}
          </div>

          {/* 🔘 Simulation toggle */}
          <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Price Mode</span>
              <button
                type="button"
                onClick={() => setIsSimOn((prev) => !prev)}
                className={`rounded-md px-3 py-1 text-[11px] font-medium transition ${isSimOn
                  ? "border border-rose-500 text-rose-300 hover:bg-rose-500/10"
                  : "border border-emerald-500 text-emerald-300 hover:bg-emerald-500/10"
                  }`}
              >
                {isSimOn ? "Stop Auto-Price" : "Start Auto-Price"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Auto-Price simulates live SPX ticks using a random walk so you can
              watch SPICE react in real time. You can still override with a
              manual price.
            </p>
          </div>

          {/* Mock price control */}
          <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Mock SPX Price</span>
              <span className="text-slate-400">
                Current:{" "}
                {price !== null && price !== undefined
                  ? price.toFixed(2)
                  : "—"}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                className="flex-1 rounded-md border border-slate-700 bg-black px-2 py-1 text-xs"
                placeholder="e.g. 5000"
                value={mockPriceInput}
                onChange={(e) => setMockPriceInput(e.target.value)}
              />
              <button
                type="button"
                onClick={handleUpdatePrice}
                className="rounded-md border border-emerald-500 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 transition"
              >
                Update
              </button>
            </div>
          </div>

          {/* 🧱 Risk config: SL / TP / Max hold */}
          <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Risk Plan (optional)</span>
              {liveTrade && (
                <span className="text-[11px] text-slate-400">
                  Applies to current trade
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-[11px] text-slate-400">
                  Stop loss (premium)
                </label>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-700 bg-black px-2 py-1 text-xs"
                  placeholder="e.g. 4.5"
                  value={stopLossInput}
                  onChange={(e) => setStopLossInput(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-slate-400">
                  Take profit (premium)
                </label>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-700 bg-black px-2 py-1 text-xs"
                  placeholder="e.g. 8.0"
                  value={takeProfitInput}
                  onChange={(e) => setTakeProfitInput(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-slate-400">
                  Max hold (minutes)
                </label>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-700 bg-black px-2 py-1 text-xs"
                  placeholder="e.g. 20"
                  value={maxHoldMinutesInput}
                  onChange={(e) => setMaxHoldMinutesInput(e.target.value)}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              If price hits your stop loss or take profit, or if the max hold
              time is exceeded, the Exit Engine will flip from HOLD to a clear
              exit recommendation.
            </p>
          </div>

          {/* ✅ Exit Engine – trade-aware recommendation */}
          <ExitRecommendationPanel
            recommendation={exitRecommendation}
            label={
              liveTrade
                ? `${liveTrade.symbol} x${liveTrade.contracts} (${liveTrade.direction})`
                : undefined
            }
          />

          {/* Raw exitDecision from core engine (keep for debug / transparency) */}
          {exitDecision && exitDecision.shouldExit && (
            <div className="rounded-lg border border-amber-500 bg-amber-500/10 p-3 text-xs text-amber-100">
              <div className="flex justify-between">
                <span className="font-semibold">Engine Exit Suggestion</span>
                {exitDecision.exitType && (
                  <span className="text-[11px] uppercase">
                    {exitDecision.exitType.replace("_", " ")}
                  </span>
                )}
              </div>
              <p className="mt-1">
                {exitDecision.reason ?? "Exit conditions met."}
              </p>
              {typeof exitDecision.targetPrice === "number" && (
                <p className="mt-1 text-[11px] text-amber-300">
                  Target price: {exitDecision.targetPrice.toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Close + log button (only when a trade is open) */}
          {hasOpenTrade && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleCloseAndLog}
                className="rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-1 text-xs text-amber-100 hover:bg-amber-500/20"
              >
                Close Trade &amp; Log
              </button>
            </div>
          )}

          {/* Debug notes */}
          {snapshot?.debug?.notes?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-slate-500">
              {snapshot.debug.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </main>
  );
}
