// lib/journal/journalTypes.ts

export type JournalResult = "win" | "loss" | "breakeven";

export type JournalEntry = {
  id: string; // unique id, e.g. ISO datetime
  symbol: string;
  direction: "long" | "short";

  entryPrice: number;
  exitPrice: number;
  contracts: number;

  openedAt: string; // ISO datetime
  closedAt: string; // ISO datetime

  notes: string;

  pnlPoints: number; // points per contract
  result: JournalResult;
};
