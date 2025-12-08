// lib/store/brokerStore.ts
"use client";

import { create } from "zustand";
import type {
  BrokerConnectionStatus,
  BrokerAccount,
  OptionPosition,
} from "@/lib/broker/brokerTypes";

interface BrokerState {
  connection: BrokerConnectionStatus | null;
  accounts: BrokerAccount[];
  positions: OptionPosition[];
  selectedAccountId: string | null;
  selectedPositionId: string | null;

  setConnection: (c: BrokerConnectionStatus | null) => void;
  setAccounts: (accounts: BrokerAccount[]) => void;
  setPositions: (positions: OptionPosition[]) => void;
  selectAccount: (id: string | null) => void;
  selectPosition: (id: string | null) => void;
}

export const useBrokerStore = create<BrokerState>((set) => ({
  connection: null,
  accounts: [],
  positions: [],
  selectedAccountId: null,
  selectedPositionId: null,

  setConnection: (connection) => set({ connection }),
  setAccounts: (accounts) => set({ accounts }),
  setPositions: (positions) => set({ positions }),
  selectAccount: (id) => set({ selectedAccountId: id }),
  selectPosition: (id) => set({ selectedPositionId: id }),
}));
