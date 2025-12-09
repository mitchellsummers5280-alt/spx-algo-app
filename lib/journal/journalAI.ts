// lib/journal/journalAI.ts

import type { JournalEntry } from "./journalTypes";

export function generateJournalFeedback(trade: JournalEntry): string {
  const msgs: string[] = [];

  // Basic result framing
  if (trade.result === "win") {
    msgs.push(
      "Win – note what you saw before entry (levels, narrative, flow) so you can repeat it."
    );
  } else if (trade.result === "loss") {
    msgs.push(
      "Loss – focus on whether you followed your plan or broke any rules."
    );
  } else {
    msgs.push(
      "Breakeven – think about whether scratching early made sense or if you cut it too soon."
    );
  }

  // Simple PnL context
  if (trade.pnlPoints > 0) {
    msgs.push(
      `Rough P&L: +${trade.pnlPoints.toFixed(
        2
      )} points per contract. Was the size appropriate for this setup?`
    );
  } else if (trade.pnlPoints < 0) {
    msgs.push(
      `Rough P&L: -${Math.abs(trade.pnlPoints).toFixed(
        2
      )} points per contract. Did you respect your stop?`
    );
  }

  // Nudge to actually write something
  if (!trade.notes || trade.notes.trim().length === 0) {
    msgs.push(
      "Add a short note about why you took this trade and one thing you'd improve next time."
    );
  }

  return msgs.join(" ");
}
