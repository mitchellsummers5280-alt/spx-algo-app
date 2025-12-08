// ----------------------------------------------------
// Trading Journal — AI Feedback
// ----------------------------------------------------

import { JournalTrade } from "./journalTypes";

export function generateJournalFeedback(trade: JournalTrade): string {
  const msgs: string[] = [];

  // 1 — Entry logic feedback  
  if (trade.thesis.toLowerCase().includes("fomo")) {
    msgs.push("It looks like FOMO influenced this trade. Review your rule on waiting for confirmation.");
  }

  if (trade.thesis.toLowerCase().includes("breakout")) {
    msgs.push("Breakouts require strong volume — consider checking liquidity before entering.");
  }

  // 2 — Outcome feedback  
  if (trade.outcome === "win") {
    msgs.push("Nice win — note exactly what confluence gave the best signal.");
  } else if (trade.outcome === "loss") {
    msgs.push("Losses happen — journal what invalidated your thesis to tighten future entries.");
  }

  // 3 — Risk management  
  if (trade.positionSize > 5) {
    msgs.push("Position size was large — consider defining max risk per trade.");
  }

  return msgs.join(" ");
}
