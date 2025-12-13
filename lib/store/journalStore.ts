// lib/store/journalStore.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Trade, TradeDirection } from "@/lib/journal/journalTypes";

interface JournalState {
  trades: Trade[];

  // Actions
  logNewTrade: (params: {
    direction: TradeDirection;
    entryPrice: number;
    contracts: number;
    setupTag?: string;
    sessionTag?: string;
    thesis?: string;
  }) => void;

  closeTrade: (tradeId: string, params: { exitPrice: number; pnl?: number }) => void;

  updateNotes: (tradeId: string, notes: string) => void;

  clearAllTrades: () => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      trades: [],

      logNewTrade: ({
        direction,
        entryPrice,
        contracts,
        setupTag,
        sessionTag,
        thesis,
      }) => {
        const newTrade: Trade = {
          id: crypto.randomUUID(),
          openedAt: Date.now(),
          direction,
          entryPrice,
          contracts,
          status: "OPEN",
          setupTag,
          sessionTag,
          thesis,
        };

        set({ trades: [newTrade, ...get().trades] });
      },

      closeTrade: (tradeId, { exitPrice, pnl }) => {
        const { trades } = get();

        const updated = trades.map((t) =>
          t.id === tradeId
            ? {
                ...t,
                status: "CLOSED",
                exitPrice,
                closedAt: Date.now(),
                pnl,
              }
            : t
        );

        set({ trades: updated });
      },

      updateNotes: (tradeId, notes) => {
        const { trades } = get();

        const updated = trades.map((t) =>
          t.id === tradeId ? { ...t, notes } : t
        );

        set({ trades: updated });
      },

      clearAllTrades: () => set({ trades: [] }),
    }),
    {
      name: "spice-journal-v1",
    }
  )
);
