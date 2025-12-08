// ----------------------------------------------------
// SPICE - Live Trade Types (Single-Active-Trade MVP)
// ----------------------------------------------------

export type LiveTradeDirection = "CALL" | "PUT";

export type LiveTrade = {
  id: string;             // unique trade id
  symbol: string;         // "SPX" / "SPY"
  direction: LiveTradeDirection;
  entryPrice: number;     // underlying price at entry
  size: number;           // number of contracts
  entryTime: number;      // Date.now()
  notes?: string;         // optional user notes
  isOpen: boolean;        // true until closed
};
