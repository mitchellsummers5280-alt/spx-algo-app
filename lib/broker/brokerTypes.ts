// lib/broker/brokerTypes.ts

export type BrokerProvider = "snaptrade"; // can expand later

export interface BrokerConnectionStatus {
  provider: BrokerProvider;
  isConnected: boolean;
  lastSyncAt?: string;
}

export interface BrokerAccount {
  id: string;
  name: string;
  type: string; // margin, cash, etc.
  currency: string;
  provider: BrokerProvider;
}

export interface OptionPosition {
  id: string;
  provider: BrokerProvider;
  accountId: string;
  symbol: string; // e.g. "SPX"
  description: string; // e.g. "SPXW 5000C 2025-01-15"
  quantity: number;
  avgPrice: number; // average premium paid
  currentPrice: number; // current premium mark
  underlying: string; // e.g. "SPX"
  expiry: string; // ISO date
  strike: number;
  right: "call" | "put";
}
