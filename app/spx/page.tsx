"use client";

import { useMemo } from "react";

import { usePolygonLive } from "@/lib/hooks/usePolygonLive";
import { useSpiceEngine } from "@/lib/hooks/useSpiceEngine";

import { useSpiceStore } from "@/lib/store/spiceStore";
import { useCandleStore } from "@/lib/store/candleStore";

function formatTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function Card({
  title,
  right,
  children,
  className = "",
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 " + className}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold tracking-wide text-zinc-400">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
      {children}
    </span>
  );
}

function CandleTable({
  label,
  candles,
}: {
  label: string;
  candles: { t: number; o: number; h: number; l: number; c: number }[];
}) {
  const last = candles.slice(-10);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-zinc-400">{label}</div>
        <div className="text-xs text-zinc-500">Total: {candles.length}</div>
      </div>

      {candles.length === 0 ? (
        <div className="text-sm text-zinc-500">No candles yet — keep SPICE open for a minute or two.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950">
              <tr className="text-zinc-400">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">O</th>
                <th className="px-3 py-2">H</th>
                <th className="px-3 py-2">L</th>
                <th className="px-3 py-2">C</th>
              </tr>
            </thead>
            <tbody className="bg-zinc-950/30">
              {last.map((c) => (
                <tr key={c.t} className="border-t border-zinc-900">
                  <td className="px-3 py-2 text-zinc-300">{formatTime(c.t)}</td>
                  <td className="px-3 py-2 text-zinc-300">{c.o.toFixed(2)}</td>
                  <td className="px-3 py-2 text-zinc-300">{c.h.toFixed(2)}</td>
                  <td className="px-3 py-2 text-zinc-300">{c.l.toFixed(2)}</td>
                  <td className="px-3 py-2 text-zinc-300">{c.c.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SpxDebugPage() {
  // ✅ ensures the candles endpoint is polled + seeds into CandleStore
  usePolygonLive();

  // ✅ runs the aggregator/engines loop (whatever you’ve wired in useSpiceEngine)
  useSpiceEngine();

  const oneMin = useCandleStore((s) => s.getCandles("1m"));
  const fiveMin = useCandleStore((s) => s.getCandles("5m"));

  const price = useSpiceStore((s) => s.price);
  const session = useSpiceStore((s) => s.session);
  const hasOpenTrade = useSpiceStore((s) => s.hasOpenTrade);

  const mte = useSpiceStore((s) => ({
    twentyEmaAboveTwoHundred: s.twentyEmaAboveTwoHundred,
    atAllTimeHigh: s.atAllTimeHigh,
    sweptAsiaHigh: s.sweptAsiaHigh,
    sweptAsiaLow: s.sweptAsiaLow,
    sweptLondonHigh: s.sweptLondonHigh,
    sweptLondonLow: s.sweptLondonLow,
    sweptNYHigh: s.sweptNYHigh,
    sweptNYLow: s.sweptNYLow,
  }));

  // ✅ read from CandleStore (single source of truth)


  const trendLabel = useMemo(() => {
    // Your store has boolean "20 EMA above 200" already.
    // If you later store exact EMA values, you can display them here.
    return mte.twentyEmaAboveTwoHundred ? "BULLISH (20 > 200)" : "BEARISH (20 < 200)";
  }, [mte.twentyEmaAboveTwoHundred]);

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <div className="mb-6">
        <div className="text-xl font-semibold">SPICE · MTE Debug</div>
        <div className="mt-1 text-sm text-zinc-500">
          Live view of candles, EMAs, sweeps, trend state, entry engine, and manual execution.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="SPX PRICE" right={<Pill>{session ?? "NEW-YORK"}</Pill>}>
          <div className="text-3xl font-semibold">{price ? price.toFixed(2) : "—"}</div>
        </Card>

        <Card title="MULTI-TIMEFRAME EMAS" right={<Pill>PRIMARY TF: 5M</Pill>}>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-zinc-500">20 EMA</div>
              <div className="mt-1 text-lg font-semibold text-zinc-300">…</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">200 EMA</div>
              <div className="mt-1 text-lg font-semibold text-zinc-300">…</div>
            </div>
          </div>
          <div className="mt-3 text-sm">
            <span className="text-zinc-500">Trend:</span>{" "}
            <span className={mte.twentyEmaAboveTwoHundred ? "text-emerald-400" : "text-red-400"}>
              {trendLabel}
            </span>
          </div>
        </Card>

        <Card title="LIQUIDITY & EXTREMES" right={<Pill>{mte.atAllTimeHigh ? "AT/NEAR ATH" : "—"}</Pill>}>
          <div className="space-y-2 text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <div className="w-16 text-zinc-500">Asia:</div>
              <Pill>High</Pill>
              <Pill>Low</Pill>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 text-zinc-500">London:</div>
              <Pill>High</Pill>
              <Pill>Low</Pill>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 text-zinc-500">New York:</div>
              <Pill>High</Pill>
              <Pill>Low</Pill>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="ENTRY ENGINE" className="lg:col-span-2" right={<span className="text-xs text-zinc-500">No runs yet</span>}>
          <div className="text-lg font-semibold">Decision: NONE</div>
          <div className="mt-1 text-sm text-zinc-500">Engine has not produced a decision yet.</div>
        </Card>

        <div className="space-y-4">
          <Card title="CURRENT TRADE" right={<Pill>{hasOpenTrade ? "OPEN" : "FLAT"}</Pill>}>
            <div className="text-sm text-zinc-500">{hasOpenTrade ? "Live trade exists in SPICE store." : "No live trade in SPICE store."}</div>
          </Card>

          <Card title="SESSION LEVELS">
            <div className="space-y-1 text-sm text-zinc-300">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Asia High</span>
                <span>—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Asia Low</span>
                <span>—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">London High</span>
                <span>—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">London Low</span>
                <span>—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">NY High</span>
                <span>—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">NY Low</span>
                <span>—</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CandleTable label="1m Candles" candles={oneMin} />
        <CandleTable label="5m Candles" candles={fiveMin} />
      </div>

      <Card title="MANUAL EXECUTION" className="mt-4">
        <div className="text-sm text-zinc-400">
          When SPICE calls an entry and you actually take that trade on Robinhood, click this button to log it into the SPICE journal.
        </div>
        <button
          className="mt-3 rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20"
          onClick={() => alert("Manual execution hook not wired yet.")}
        >
          I took this trade
        </button>
      </Card>
    </div>
  );
}
