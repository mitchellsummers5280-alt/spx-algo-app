// lib/engines/entryRules.ts

export type EntryDirection = "CALL" | "PUT";
export type Bias = "long" | "short" | "neutral";

export interface EntryRuleInput {
  price: number | null;
  hasOpenTrade: boolean;
  session: string | null;

  twentyEmaAboveTwoHundred?: boolean | null;
  atAllTimeHigh?: boolean | null;

  sweptAsiaHigh?: boolean;
  sweptAsiaLow?: boolean;
  sweptLondonHigh?: boolean;
  sweptLondonLow?: boolean;

  newsImpactOn?: boolean | null;

  now?: number;
}

export interface RuleOutcome {
  shouldEnter: boolean;
  direction: EntryDirection | null;
  reason: string | null;
}

// -------- BIAS --------

export function deriveBias(input: EntryRuleInput): Bias {
  if (input.twentyEmaAboveTwoHundred && !input.atAllTimeHigh) return "long";
  if (input.twentyEmaAboveTwoHundred === false) return "short";
  return "neutral";
}

// -------- LONG RULE #1 — LIQUIDITY SWEEP --------

export function longLiquiditySweepRule(
  input: EntryRuleInput,
  bias: Bias
): RuleOutcome {
  const session = (input.session ?? "").toLowerCase();

  const active =
    bias === "long" &&
    session === "new-york" &&
    (input.sweptLondonLow || input.sweptAsiaLow) &&
    !input.atAllTimeHigh;

  if (!active) return { shouldEnter: false, direction: null, reason: null };

  return {
    shouldEnter: true,
    direction: "CALL",
    reason:
      "NY session + long bias + sweep of London/Asia low away from ATH (Tier A setup).",
  };
}

// -------- SHORT RULE #1 — LIQUIDITY SWEEP --------

export function shortLiquiditySweepRule(
  input: EntryRuleInput,
  bias: Bias
): RuleOutcome {
  const session = (input.session ?? "").toLowerCase();

  const active =
    bias === "short" &&
    session === "new-york" &&
    (input.sweptLondonHigh || input.sweptAsiaHigh);

  if (!active) return { shouldEnter: false, direction: null, reason: null };

  return {
    shouldEnter: true,
    direction: "PUT",
    reason:
      "NY session + short bias + sweep of London/Asia high (Tier A setup).",
  };
}

// -------- LONG RULE #2 — ATH BREAKOUT LONG --------

export function athBreakoutLongRule(
  input: EntryRuleInput,
  bias: Bias
): RuleOutcome {
  const session = (input.session ?? "").toLowerCase();

  // Only consider ATH breakout if:
  const active =
    bias === "long" &&
    input.atAllTimeHigh === true && // we are literally pressing ATH
    session === "new-york" &&
    input.newsImpactOn !== true; // avoid FOMC/News landmines

  if (!active) return { shouldEnter: false, direction: null, reason: null };

  return {
    shouldEnter: true,
    direction: "CALL",
    reason:
      "Breakout long: long bias + pressing ATH + NY session + news off (Tier B setup).",
  };
}

// -------- SHORT RULE #2 — ATH EXHAUSTION SHORT --------

export function athExhaustionShortRule(
  input: EntryRuleInput,
  bias: Bias
): RuleOutcome {
  const session = (input.session ?? "").toLowerCase();

  // Only fire if at ATH and we swept highs
  const active =
    input.atAllTimeHigh === true &&
    session === "new-york" &&
    (input.sweptLondonHigh || input.sweptAsiaHigh);

  if (!active) return { shouldEnter: false, direction: null, reason: null };

  // NOTE: Tier C (riskier) unless bias is actually short
  const direction: EntryDirection = "PUT";
  const tier = bias === "short" ? "Tier B" : "Tier C (countertrend)";

  return {
    shouldEnter: true,
    direction,
    reason: `Exhaustion short at ATH after liquidity sweep (${tier}).`,
  };
}
