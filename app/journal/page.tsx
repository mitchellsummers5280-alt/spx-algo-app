// app/journal/page.tsx
"use client";

import { useMemo } from "react";
import { useJournalStore } from "@/lib/store/journalStore";
import type { JournalEntry } from "@/lib/journal/journalTypes";

function formatDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined) return "—";
  return n.toFixed(digits);
}

export default function JournalPage() {
  const entries = useJournalStore((s) => s.entries);

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) =>
        (b.closedAt || "").localeCompare(a.closedAt || "")
      ),
    [entries]
  );

  const stats = useMemo(() => {
    if (entries.length === 0) {
      return {
        total: 0,
        wins: 0,
        losses: 0,
        breakevens: 0,
        winRate: 0,
        avgPnl: 0,
      };
    }

    let wins = 0;
    let losses = 0;
    let breakevens = 0;
    let pnlSum = 0;

    for (const e of entries) {
      if (e.result === "win") wins++;
      else if (e.result === "loss") losses++;
      else if (e.result === "breakeven") breakevens++;

      pnlSum += e.pnlPoints ?? 0;
    }

    const total = entries.length;
    const winRate = total ? (wins / total) * 100 : 0;
    const avgPnl = total ? pnlSum / total : 0;

    return { total, wins, losses, breakevens, winRate, avgPnl };
  }, [entries]);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">
            SPICE Trading Journal
          </h1>
          <p className="text-xs text-slate-400">
            Every time you <span className="font-semibold">Close Trade &amp; Log</span>{" "}
            on the Live page, a new entry appears here.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-black/60 px-4 py-3 text-xs">
          <div>
            <div className="text-[11px] uppercase text-slate-500">Trades</div>
            <div className="text-sm font-semibold text-slate-100">
              {stats.total}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase text-slate-500">Win rate</div>
            <div className="text-sm font-semibold text-emerald-300">
              {formatNumber(stats.winRate, 1)}%
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase text-slate-500">
              Avg P/L (pts)
            </div>
            <div
              className={`text-sm font-semibold ${
                stats.avgPnl > 0
                  ? "text-emerald-300"
                  : stats.avgPnl < 0
                  ? "text-rose-300"
                  : "text-slate-300"
              }`}
            >
              {formatNumber(stats.avgPnl, 1)}
            </div>
          </div>
        </div>
      </header>

      {sortedEntries.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-black/60 p-6 text-sm text-slate-400">
          No trades logged yet. Go to{" "}
          <span className="font-semibold text-slate-200">SPICE Live</span>, start
          a trade, and use <span className="font-semibold">Close Trade &amp; Log</span>{" "}
          to create your first journal entry.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-black/60">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900/80 text-[11px] uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Closed</th>
                <th className="px-3 py-2 text-left">Symbol</th>
                <th className="px-3 py-2 text-left">Dir</th>
                <th className="px-3 py-2 text-right">Contracts</th>
                <th className="px-3 py-2 text-right">Entry</th>
                <th className="px-3 py-2 text-right">Exit</th>
                <th className="px-3 py-2 text-right">P/L (pts)</th>
                <th className="px-3 py-2 text-left">Result</th>
                <th className="px-3 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry: JournalEntry) => (
                <tr
                  key={entry.id}
                  className="border-t border-slate-800/80 hover:bg-slate-900/40"
                >
                  <td className="px-3 py-2 text-slate-300">
                    {formatDateTime(entry.closedAt || entry.openedAt)}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-100">
                    {entry.symbol}
                  </td>
                  <td className="px-3 py-2 text-slate-200">
                    {entry.direction}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200">
                    {entry.contracts ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200">
                    {formatNumber(entry.entryPrice, 1)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-200">
                    {formatNumber(entry.exitPrice, 1)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-semibold ${
                      (entry.pnlPoints ?? 0) > 0
                        ? "text-emerald-300"
                        : (entry.pnlPoints ?? 0) < 0
                        ? "text-rose-300"
                        : "text-slate-300"
                    }`}
                  >
                    {formatNumber(entry.pnlPoints, 1)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        entry.result === "win"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                          : entry.result === "loss"
                          ? "bg-rose-500/10 text-rose-300 border border-rose-500/40"
                          : "bg-slate-700/40 text-slate-200 border border-slate-600/60"
                      }`}
                    >
                      {entry.result}
                    </span>
                  </td>
                  <td className="max-w-xs px-3 py-2 text-slate-300">
                    <span className="line-clamp-2">
                      {entry.notes?.trim() || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
