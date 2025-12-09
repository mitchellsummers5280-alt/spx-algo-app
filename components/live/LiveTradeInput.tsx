"use client";

import React, { useState } from "react";
import { useSpiceStore } from "@/lib/store/spiceStore";
import type { LiveTrade, LiveTradeDirection } from "@/lib/tradeTypes";

export default function LiveTradeInput() {
  // ---- local form state ----
  const [symbol, setSymbol] = useState("SPX");
  const [direction, setDirection] = useState<LiveTradeDirection>("CALL");
  const [entryPrice, setEntryPrice] = useState("");
  const [size, setSize] = useState("1");
  const [notes, setNotes] = useState("");

  // ---- global store ----
  const startLiveTrade = useSpiceStore((s) => s.startLiveTrade);
  const liveTrade = useSpiceStore((s) => s.liveTrade);
  const hasOpenTrade = useSpiceStore((s) => s.hasOpenTrade);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = parseFloat(entryPrice);
    const sizeNum = parseInt(size, 10);

    if (!priceNum || Number.isNaN(priceNum)) return;
    if (!sizeNum || Number.isNaN(sizeNum)) return;

    const now = new Date().toISOString();

    // map CALL/PUT to long/short for the engine
    const tradeDirection: "long" | "short" =
      direction === "CALL" ? "long" : "short";

    const nowTs = Date.now();

    const trade: LiveTrade = {
      id: String(nowTs),
      symbol: symbol.trim() || "SPX",
      direction,          // "CALL" | "PUT" (matches LiveTradeDirection)
      entryPrice: priceNum,
      size: sizeNum,
      entryTime: nowTs,
      notes,
      isOpen: true,
    };

    startLiveTrade(trade);
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-black/60 p-4">
      <h2 className="text-sm font-semibold text-slate-100">Live Trade Input</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-slate-700 bg-black/40 px-2 py-1 text-sm text-slate-100"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol (SPX)"
          />
          <select
            className="rounded-md border border-slate-700 bg-black/40 px-2 py-1 text-sm text-slate-100"
            value={direction}
            onChange={(e) =>
              setDirection(e.target.value as LiveTradeDirection)
            }
          >
            <option value="CALL">CALL</option>
            <option value="PUT">PUT</option>
          </select>
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-slate-700 bg-black/40 px-2 py-1 text-sm text-slate-100"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            placeholder="Entry price"
            type="number"
            step="0.1"
          />
          <input
            className="w-24 rounded-md border border-slate-700 bg-black/40 px-2 py-1 text-sm text-slate-100"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="Size"
            type="number"
            min={1}
            step={1}
          />
        </div>

        <textarea
          className="w-full rounded-md border border-slate-700 bg-black/40 px-2 py-1 text-xs text-slate-100"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (setup / ICT narrative / reasons for entry)"
          rows={2}
        />

        <button
          type="submit"
          className="w-full rounded-md border border-emerald-600/20 bg-emerald-600/20 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/30"
        >
          {hasOpenTrade ? "Update Live Trade" : "Start Live Trade"}
        </button>
      </form>

      <p className="text-[11px] text-slate-400">
        {hasOpenTrade && liveTrade
          ? `Active trade: ${liveTrade.symbol} @ ${liveTrade.entryPrice}. Use the Engine Snapshot panel on the right to manage exits and journaling.`
          : "No active trade. Use the form above to start tracking a live SPX trade."}
      </p>
    </section>
  );
}
