// app/broker/page.tsx
"use client";

import { useEffect } from "react";
import { useBrokerStore } from "@/lib/store/brokerStore";

function formatCurrency(n: number | string | null | undefined) {
  const num = typeof n === "string" ? Number(n) : n;
  if (num === null || num === undefined || Number.isNaN(num)) return "-";
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default function BrokerPage() {
  const {
    accounts,
    positions,
    transactions,
    selectedAccountId,
    accountsStatus,
    positionsStatus,
    transactionsStatus,
    error,
    fetchAccounts,
    selectAccount,
    refreshAccountData,
  } = useBrokerStore();

  // Load accounts on first visit
  useEffect(() => {
    if (accountsStatus === "idle") {
      fetchAccounts();
    }
  }, [accountsStatus, fetchAccounts]);

  const selectedAccount = accounts.find((a: any) => {
    const id = a.id ?? a.account_id;
    return id === selectedAccountId;
  });

  return (
    <main className="min-h-screen bg-black text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Brokerage Dashboard
            </h1>
            <p className="text-sm text-slate-400">
              Live data pulled from your connected SnapTrade accounts.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => fetchAccounts()}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-900"
            >
              Refresh Accounts
            </button>
            <button
              onClick={() =>
                selectedAccountId && refreshAccountData(selectedAccountId)
              }
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-900"
              disabled={!selectedAccountId}
            >
              Refresh Positions
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Accounts row */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Accounts
          </h2>

          {accountsStatus === "loading" && (
            <div className="text-sm text-slate-400">Loading accounts…</div>
          )}

          {accountsStatus === "success" && accounts.length === 0 && (
            <div className="text-sm text-slate-400">
              No accounts found yet. Make sure you’ve connected a broker via
              SnapTrade, then click{" "}
              <span className="font-semibold">Refresh Accounts</span>.
            </div>
          )}

          {accountsStatus === "success" && accounts.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {accounts.map((acct: any) => {
                const id = acct.id ?? acct.account_id;
                const label =
                  acct.name ??
                  acct.nickname ??
                  acct.account_number ??
                  id ??
                  "Account";

                const institution =
                  acct.institution_name ??
                  acct.institution ??
                  "Brokerage";

                const currency = acct.currency ?? "USD";

                const isActive = id === selectedAccountId;

                return (
                  <button
                    key={id}
                    onClick={() => selectAccount(id)}
                    className={`flex min-w-[180px] flex-1 flex-col items-start rounded-xl border px-3 py-2 text-left text-sm transition
                      ${isActive
                        ? "border-emerald-400 bg-emerald-500/10"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
                      }`}
                  >
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-slate-400">{institution}</div>
                    <div className="mt-1 text-[11px] uppercase text-slate-500">
                      {currency}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Data grids */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Positions */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Positions
              </h2>
              <span className="text-xs text-slate-500">
                {selectedAccount
                  ? (selectedAccount.name ??
                    selectedAccount.nickname ??
                    selectedAccount.account_number ??
                    "Selected account")
                  : "Select an account"}
              </span>
            </div>

            {positionsStatus === "loading" && (
              <div className="text-sm text-slate-400">Loading positions…</div>
            )}

            {positionsStatus === "success" && positions.length === 0 && (
              <div className="text-sm text-slate-400">
                No open positions for this account.
              </div>
            )}

            {positionsStatus === "success" && positions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="px-2 py-1 font-medium">Symbol</th>
                      <th className="px-2 py-1 font-medium">Qty</th>
                      <th className="px-2 py-1 font-medium">Price</th>
                      <th className="px-2 py-1 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {positions.map((pos: any, idx: number) => {
                      const rawSymbol =
                        pos.symbol ??
                        pos.symbol_code ??
                        pos.ticker ??
                        null;

                      let symbol = "—";

                      if (rawSymbol != null) {
                        if (typeof rawSymbol === "string" || typeof rawSymbol === "number") {
                          // direct string/number
                          symbol = String(rawSymbol);
                        } else if (typeof rawSymbol === "object") {
                          // first-level extraction
                          const level1 =
                            (rawSymbol as any).symbol ??
                            (rawSymbol as any).symbol_code ??
                            (rawSymbol as any).ticker ??
                            (rawSymbol as any).local_id ??
                            (rawSymbol as any).local_symbol;

                          if (typeof level1 === "string" || typeof level1 === "number") {
                            symbol = String(level1);
                          } else if (level1 && typeof level1 === "object") {
                            // second-level extraction (symbol.symbol, etc.)
                            const level2 =
                              (level1 as any).symbol ??
                              (level1 as any).symbol_code ??
                              (level1 as any).ticker ??
                              (level1 as any).local_id ??
                              (level1 as any).local_symbol;

                            if (typeof level2 === "string" || typeof level2 === "number") {
                              symbol = String(level2);
                            }
                          }
                        }
                      }

                      const qty =
                        pos.quantity ??
                        pos.units ??
                        pos.units_total ??
                        0;

                      const price =
                        pos.price ??
                        pos.last_price ??
                        pos.current_price ??
                        null;

                      const marketValue =
                        pos.market_value ??
                        pos.current_market_value ??
                        (price != null ? Number(price) * Number(qty) : null);

                      return (
                        <tr key={pos.id ?? pos.position_id ?? idx}>
                          <td className="px-2 py-1 text-[11px] font-medium">
                            {symbol}
                          </td>
                          <td className="px-2 py-1 text-[11px]">
                            {qty ?? "-"}
                          </td>
                          <td className="px-2 py-1 text-[11px]">
                            {price != null ? Number(price).toFixed(2) : "-"}
                          </td>
                          <td className="px-2 py-1 text-[11px]">
                            {formatCurrency(marketValue)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Transactions */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Recent Activity
              </h2>
              <span className="text-xs text-slate-500">
                {transactionsStatus === "success" && transactions.length > 0
                  ? `${transactions.length} records`
                  : ""}
              </span>
            </div>

            {transactionsStatus === "loading" && (
              <div className="text-sm text-slate-400">
                Loading recent activity…
              </div>
            )}

            {transactionsStatus === "success" && transactions.length === 0 && (
              <div className="text-sm text-slate-400">
                No recent activity for this account.
              </div>
            )}

            {transactionsStatus === "success" && transactions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="px-2 py-1 font-medium">Date</th>
                      <th className="px-2 py-1 font-medium">Symbol</th>
                      <th className="px-2 py-1 font-medium">Action</th>
                      <th className="px-2 py-1 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {transactions.map((tx: any, idx: number) => {
                      const date =
                        tx.trade_date ??
                        tx.transaction_date ??
                        tx.settlement_date ??
                        tx.created_at ??
                        "";

                      const rawTxSymbol =
                        tx.symbol ??
                        tx.symbol_code ??
                        tx.ticker ??
                        null;

                      let txSymbol: string;
                      if (
                        typeof rawTxSymbol === "string" ||
                        typeof rawTxSymbol === "number"
                      ) {
                        txSymbol = String(rawTxSymbol);
                      } else if (
                        rawTxSymbol &&
                        typeof rawTxSymbol === "object" &&
                        "symbol" in rawTxSymbol
                      ) {
                        txSymbol = String((rawTxSymbol as any).symbol);
                      } else {
                        txSymbol = "";
                      }

                      const action =
                        tx.transaction_type ??
                        tx.activity_type ??
                        tx.action ??
                        "";

                      const amount =
                        tx.amount ??
                        tx.value ??
                        tx.gross_amount ??
                        null;

                      return (
                        <tr key={tx.id ?? tx.transaction_id ?? idx}>
                          <td className="px-2 py-1 text-[11px]">
                            {date ? String(date).slice(0, 10) : "-"}
                          </td>
                          <td className="px-2 py-1 text-[11px]">
                            {txSymbol || "-"}
                          </td>
                          <td className="px-2 py-1 text-[11px]">
                            {action || "-"}
                          </td>
                          <td className="px-2 py-1 text-[11px]">
                            {amount !== null && amount !== undefined
                              ? formatCurrency(amount)
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
