// lib/journal/journalTypes.ts

export type TradeDirection = "CALL" | "PUT";

export type TradeStatus = "OPEN" | "CLOSED";

export interface Trade {
  id: string; // e.g. crypto.randomUUID()
  openedAt: number; // timestamp (ms)
  closedAt?: number;

  direction: TradeDirection;

  // SPX price at entry/exit (underlying, not option price)
  entryPrice: number;
  exitPrice?: number;

  // Size / risk
  contracts: number;
  riskPerContract?: number; // optional, for R-multiple later

  // PnL tracking (you can fill this manually or compute later)
  pnl?: number; // total $ PnL
  pnlR?: number; // PnL in R multiples, if using riskPerContract

  status: TradeStatus;

  // Context / metadata from SPICE engines
  setupTag?: string; // e.g. "ATH_BREAKOUT", "ASIA_SWEEP", "LONDON_SWEEP"
  sessionTag?: string; // e.g. "OPENING_DRIVE", "POWER_HOUR"

  // For your notes / journaling
  thesis?: string;
  notes?: string;
}
