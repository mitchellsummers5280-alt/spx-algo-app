// lib/store/brokerStore.ts
import { create } from "zustand";

type LoadStatus = "idle" | "loading" | "error" | "success";

export interface BrokerState {
  accounts: any[];
  positions: any[];
  transactions: any[];

  selectedAccountId: string | null;

  accountsStatus: LoadStatus;
  positionsStatus: LoadStatus;
  transactionsStatus: LoadStatus;

  error: string | null;

  fetchAccounts: () => Promise<void>;
  selectAccount: (accountId: string) => void;
  refreshAccountData: (accountId?: string) => Promise<void>;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Request failed (${res.status}) ${res.statusText} ${text ? `- ${text}` : ""}`.trim()
    );
  }
  return res.json();
}

export const useBrokerStore = create<BrokerState>((set, get) => ({
  accounts: [],
  positions: [],
  transactions: [],

  selectedAccountId: null,

  accountsStatus: "idle",
  positionsStatus: "idle",
  transactionsStatus: "idle",

  error: null,

  fetchAccounts: async () => {
    try {
      set({ accountsStatus: "loading", error: null });

      // /api/snaptrade/accounts => [ { id, name, ... }, ... ]
      const data = await getJson<any[]>("/api/snaptrade/accounts");

      const firstAccountId =
        (data?.[0]?.id as string) ||
        (data?.[0]?.account_id as string) ||
        null;

      set({
        accounts: data ?? [],
        accountsStatus: "success",
        selectedAccountId: firstAccountId,
      });

      if (firstAccountId) {
        await get().refreshAccountData(firstAccountId);
      }
    } catch (err: any) {
      console.error("Error fetching accounts", err);
      set({
        accountsStatus: "error",
        error: err?.message ?? "Failed to load accounts",
      });
    }
  },

  selectAccount: (accountId: string) => {
    set({ selectedAccountId: accountId });
    get().refreshAccountData(accountId).catch((err) => {
      console.error("Error refreshing account data", err);
    });
  },

  refreshAccountData: async (accountId?: string) => {
    const id = accountId ?? get().selectedAccountId;
    if (!id) return;

    try {
      set({
        positionsStatus: "loading",
        transactionsStatus: "loading",
        error: null,
      });

      // Positions endpoint returns: { positions: [], note: "..." }
      const positionsRes = await getJson<{ positions?: any[]; [k: string]: any }>(
        `/api/snaptrade/positions?accountId=${encodeURIComponent(id)}`
      );

      // Transactions endpoint returns: { data: [], pagination: {...} }
      const transactionsRes = await getJson<{ data?: any[]; [k: string]: any }>(
        `/api/snaptrade/transactions?accountId=${encodeURIComponent(id)}`
      );

      set({
        positions: positionsRes.positions ?? [],
        transactions: transactionsRes.data ?? [],
        positionsStatus: "success",
        transactionsStatus: "success",
      });
    } catch (err: any) {
      console.error("Error fetching positions/transactions", err);
      set({
        positionsStatus: "error",
        transactionsStatus: "error",
        error: err?.message ?? "Failed to load positions/transactions",
      });
    }
  },
}));
