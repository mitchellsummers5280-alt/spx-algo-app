// app/journal/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useJournalStore } from "lib/store/journalStore";

function formatDate(ms: number | undefined) {
  if (!ms) return "-";
  return new Date(ms).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function JournalPage() {
  const trades = useJournalStore((s) => s.trades);
  const updateNotes = useJournalStore((s) => s.updateNotes);
  const clearAllTrades = useJournalStore((s) => s.clearAllTrades);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const stats = useMemo(() => {
    if (!trades.length) return null;

    const closed = trades.filter((t) => t.status === "CLOSED" && typeof t.pnl === "number");
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0);
    const losses = closed.filter((t) => (t.pnl ?? 0) < 0);

    const totalPnl = closed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;

    return {
      totalTrades: trades.length,
      closedTrades: closed.length,
      winRate,
      totalPnl,
      avgWin: wins.length
        ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length
        : 0,
      avgLoss: losses.length
        ? losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length
        : 0,
    };
  }, [trades]);

  return (
    <div className="min-h-screen bg-black px-6 py-8 text-zinc-100">
      <h1 className="mb-4 text-2xl font-semibold">SPICE Trading Journal</h1>

      {/* Stats Summary */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-xs uppercase text-zinc-400">Total Trades</div>
          <div className="mt-1 text-2xl font-semibold">
            {stats?.totalTrades ?? 0}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-xs uppercase text-zinc-400">Win Rate</div>
          <div className="mt-1 text-2xl font-semibold">
            {stats ? stats.winRate.toFixed(1) : "0.0"}%
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-xs uppercase text-zinc-400">Total PnL</div>
          <div
            className={`mt-1 text-2xl font-semibold ${
              stats && stats.totalPnl > 0
                ? "text-emerald-400"
                : stats && stats.totalPnl < 0
                ? "text-red-400"
                : "text-zinc-100"
            }`}
          >
            {stats ? stats.totalPnl.toFixed(2) : "0.00"}
          </div>
        </div>
      </div>

      {/* Trade Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950/70">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/70 text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">Opened</th>
              <th className="px-3 py-2 text-left">Direction</th>
              <th className="px-3 py-2 text-left">Setup</th>
              <th className="px-3 py-2 text-right">Entry</th>
              <th className="px-3 py-2 text-right">Exit</th>
              <th className="px-3 py-2 text-right">Contracts</th>
              <th className="px-3 py-2 text-right">PnL</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr
                key={t.id}
                className="border-t border-zinc-800/70 hover:bg-zinc-900/40"
                onClick={() => {
                  setSelectedId(t.id);
                  setNotesDraft(t.notes ?? "");
                }}
              >
                <td className="px-3 py-2">{formatDate(t.openedAt)}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      t.direction === "CALL"
                        ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400"
                        : "rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400"
                    }
                  >
                    {t.direction}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-zinc-300">
                  {t.setupTag ?? "-"}
                </td>
                <td className="px-3 py-2 text-right">
                  {t.entryPrice.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  {t.exitPrice !== undefined ? t.exitPrice.toFixed(2) : "-"}
                </td>
                <td className="px-3 py-2 text-right">{t.contracts}</td>
                <td className="px-3 py-2 text-right">
                  {t.pnl !== undefined ? (
                    <span
                      className={
                        t.pnl > 0
                          ? "text-emerald-400"
                          : t.pnl < 0
                          ? "text-red-400"
                          : "text-zinc-100"
                      }
                    >
                      {t.pnl.toFixed(2)}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-400">
                  {t.status}
                </td>
              </tr>
            ))}

            {!trades.length && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-sm text-zinc-500"
                >
                  No trades logged yet. When SPICE calls a setup and you take it
                  on Robinhood, log it here so we can track performance.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Notes editor for selected trade */}
      {selectedId && (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="mb-2 text-xs uppercase text-zinc-400">
            Notes for Trade
          </div>
          <textarea
            className="h-24 w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-xl border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-emerald-500 hover:text-emerald-400"
              onClick={() => {
                updateNotes(selectedId, notesDraft);
              }}
            >
              Save Notes
            </button>
            <button
              className="rounded-xl border border-red-700/70 px-3 py-1.5 text-xs text-red-300 hover:border-red-500"
              onClick={() => {
                if (confirm("Clear ALL trades from the journal?")) {
                  clearAllTrades();
                  setSelectedId(null);
                  setNotesDraft("");
                }
              }}
            >
              Clear All Trades
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
