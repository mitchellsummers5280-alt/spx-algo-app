// lib/spice/engines/contextEngine.ts

import type { EngineOutput, Session } from "./engineTypes";

/**
 * Types specific to the Context Engine.
 */

export type NewsRiskLevel = 0 | 1 | 2; // 0 = safe, 1 = mild, 2 = high

export type FlowBias = "bullish" | "bearish" | "neutral";

export type FlowSummary = {
  bias: FlowBias;
  /** Strength of flow signal 0–100. */
  strength: number;
  /** Example: "heavy 0DTE call buying at 4700+". */
  headline?: string;
  /** Any notable strikes/levels in the flow. */
  keyLevels?: number[];
};

export type SessionBias = {
  session: Session;
  /** Qualitative description, e.g., "likely range", "expansion", etc. */
  narrative: string;
};

export type NewsEvent = {
  id: string;
  timestamp: number;
  title: string;
  /** e.g., "FOMC", "CPI", "NFP", "Fed Speaker" */
  category?: string;
  /** How impactful this event is expected to be (0–100). */
  impactScore: number;
};

export type ContextEngineInput = {
  session: Session;
  /** True if user wants the algo to consider news in its decisions. */
  newsImpactEnabled: boolean;
  /** True if user wants the algo to consider options flow in its decisions. */
  flowImpactEnabled: boolean;
  /** Optional list of upcoming or recent news events. */
  upcomingNews?: NewsEvent[];
  recentNews?: NewsEvent[];
  /** Optional flow snapshot (e.g., from Unusual Whales API). */
  flowSnapshot?: unknown; // refine when API shape is known
};

export type ContextEngineOutput = {
  sessionBias: SessionBias;
  newsRiskLevel: NewsRiskLevel;
  newsEventsOfInterest: NewsEvent[];
  flowSummary?: FlowSummary;
  /** A "global risk throttle" 0–100 that other engines can use to scale aggression. */
  riskThrottle: number;
};

/**
 * Main Context Engine runner.
 *
 * Produces:
 * - session bias narrative
 * - news risk level (0/1/2)
 * - summarized options flow
 * - global risk throttle (0–100)
 */
export function runContextEngine(
  input: ContextEngineInput
): EngineOutput<ContextEngineOutput> {
  const now = Date.now();

  // TODO: Replace with real mapping from:
  // - session
  // - upcoming high-impact events
  // - options flow snapshot
  // into a riskThrottle and narratives.

  const sessionBias: SessionBias = {
    session: input.session,
    narrative: "ContextEngine placeholder: session bias not yet implemented.",
  };

  const highImpactNews =
    input.upcomingNews?.filter((n) => n.impactScore >= 70) ?? [];

  const newsRiskLevel: NewsRiskLevel =
    !input.newsImpactEnabled || highImpactNews.length === 0 ? 0 : 2;

  const flowSummary: FlowSummary | undefined = input.flowImpactEnabled
    ? {
        bias: "neutral",
        strength: 0,
        headline: "ContextEngine placeholder: flow analysis not yet implemented.",
        keyLevels: [],
      }
    : undefined;

  const riskThrottle =
    newsRiskLevel === 2
      ? 40 // e.g., reduce position sizing during high-risk news
      : 80; // placeholder higher risk allowance otherwise

  const data: ContextEngineOutput = {
    sessionBias,
    newsRiskLevel,
    newsEventsOfInterest: highImpactNews,
    flowSummary,
    riskThrottle,
  };

  return {
    timestamp: now,
    data,
    confidence: 0,
    notes: ["ContextEngine: placeholder implementation"],
  };
}
