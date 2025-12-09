// app/spx/page.tsx
"use client";

// app/spx/page.tsx (or wherever you want)
import { ConnectBrokerButton } from "@/components/broker/ConnectBrokerButton";

// inside your JSX, maybe under the SPX header:
<div className="flex items-center justify-between mb-4">
  <h1 className="text-lg font-semibold text-slate-100">SPICE – SPX Overview</h1>
  <ConnectBrokerButton />
</div>

import { mockSpxAlgoState } from "lib/spxNarrative";
import { useSpiceEngine } from "lib/hooks/useSpiceEngine";

export default function SpxPage() {
  // keep the engine running so context stays fresh
  useSpiceEngine();

  const state = mockSpxAlgoState;

  return (
    <main className="min-h-screen bg-black text-white space-y-6 p-6">
      {/* 🔥 Quick nav to Live trading */}
      <div className="mb-4 flex justify-end">
        <a
          href="/live"
          className="rounded-md border border-emerald-500 px-3 py-1.5 text-sm text-emerald-400 hover:bg-emerald-500/10 transition"
        >
          Go to Live Trading →
        </a>
      </div>

      {/* Market Overview */}
      <section className="rounded-xl border border-slate-700 p-4 space-y-3">
        <h1 className="text-2xl font-bold">SPICE – SPX Overview</h1>

        {/* SPX price strip */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full border border-slate-600 px-3 py-1">
            {state.symbol}
          </span>

          <span className="text-lg font-semibold">
            {state.price.last.toFixed(2)}
          </span>

          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${state.price.change >= 0
              ? "bg-emerald-500 text-black"
              : "bg-red-500 text-black"
              }`}
          >
            {state.price.change >= 0 ? "+" : ""}
            {state.price.change.toFixed(2)} (
            {state.price.changePct.toFixed(2)}%)
          </span>
        </div>

        {/* High-level narrative (temporarily static until we wire a real overview field) */}
        <p className="text-sm text-slate-300 mt-3">
          SPICE is watching SPX order flow, trend, and liquidity zones. This box will
          eventually show a live narrative summary once we add an `overview` field to
          the engine state.
        </p>
      </section>

      {/* Timeframe cards */}
      <section className="grid gap-4 md:grid-cols-2">
        {state.timeframes.map((tf, idx) => (
          <article
            key={tf.timeframe ?? idx} // unique key based on timeframe
            className="rounded-xl border border-slate-700 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {tf.timeframe}
                {tf.bias ? (
                  <span className="ml-2 text-[11px] text-amber-300">
                    {tf.bias}
                  </span>
                ) : null}
              </h2>

              {tf.tag && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tf.tagColor ?? "bg-slate-700"
                    }`}
                >
                  {tf.tag}
                </span>
              )}
            </div>

            <ul className="space-y-1 text-xs text-slate-300">
              {(tf.notes ?? []).map((note: string, i: number) => (
                <li key={i}>• {note}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
