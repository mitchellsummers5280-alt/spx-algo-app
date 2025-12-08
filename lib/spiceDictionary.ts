// lib/spiceDictionary.ts

// --------------------------------------------------------
// Core Types
// --------------------------------------------------------

export type TimeframeId =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "D";

export type BiasDirection = "bullish" | "bearish" | "neutral";

export type AlgoConceptCategory =
  | "trend"
  | "session"
  | "liquidity"
  | "structure"
  | "momentum"
  | "flow"
  | "news"
  | "risk"
  | "meta";

// How strong / important a concept is in scoring by default
// 0 = informational only
// 1 = light influence
// 2 = medium influence
// 3 = heavy influence
export type WeightLevel = 0 | 1 | 2 | 3;

export interface AlgoConcept {
  /** Stable ID used in code, configs, and UI toggles */
  id: string;
  /** Human-readable label for the UI */
  label: string;
  /** Compact label for pills / tags */
  shortLabel?: string;
  /** Simple description in your own language */
  description: string;
  /** High-level bucket (trend, session, liquidity, etc.) */
  category: AlgoConceptCategory;
  /** Default “importance” in the overall score */
  defaultWeight: WeightLevel;
  /** Timeframes this concept mostly cares about */
  timeframes?: TimeframeId[];
  /** Tags for filtering / searching in UI */
  tags?: string[];
  /** Which engine outputs this concept depends on */
  inputs?: string[];
  /** Optional notes / implementation hints for yourself */
  notes?: string;
  /** Optional references to ideas/mentors (ICT, TJR, etc.) */
  references?: string[];
}

// For convenience in other files
export type AlgoConceptId = typeof SPICE_DICTIONARY[number]["id"];

// --------------------------------------------------------
// Dictionary Entries
// --------------------------------------------------------

// Trend / EMA concepts
const trendConcepts: AlgoConcept[] = [
  {
    id: "ema20_intraday_trend",
    label: "20 EMA Intraday Trend",
    shortLabel: "20 EMA",
    description:
      "Uses the 20 EMA slope and price position to define short-term intraday trend.",
    category: "trend",
    defaultWeight: 3,
    timeframes: ["1m", "3m", "5m", "15m"],
    tags: ["EMA", "trend", "intraday"],
    inputs: ["ema20Slope", "priceVsEma20"],
    notes:
      "Bullish when price is riding above 20 EMA with positive slope; bearish when below with negative slope.",
  },
  {
    id: "ema200_macro_trend",
    label: "200 EMA Macro Bias",
    shortLabel: "200 EMA",
    description:
      "Uses the 200 EMA as a macro line in the sand for bullish or bearish bias.",
    category: "trend",
    defaultWeight: 3,
    timeframes: ["15m", "30m", "1h", "4h"],
    tags: ["EMA", "macro", "bias"],
    inputs: ["ema200Slope", "priceVsEma200"],
    notes:
      "If price is above a rising 200 EMA on higher timeframes, treat overall bias as bullish, and vice versa.",
  },
  {
    id: "ema20_200_alignment",
    label: "20 / 200 EMA Alignment",
    shortLabel: "20 / 200",
    description:
      "Checks whether the 20 EMA and 200 EMA are aligned for trend continuation or crossed for a shift in bias.",
    category: "trend",
    defaultWeight: 2,
    timeframes: ["5m", "15m", "30m"],
    tags: ["EMA", "confluence"],
    inputs: ["ema20Value", "ema200Value"],
    notes:
      "Higher conviction when 20 EMA is on the same side of 200 EMA as price and both slopes agree.",
  },
];

// Structure / levels
const structureConcepts: AlgoConcept[] = [
  {
    id: "all_time_high_proximity",
    label: "All-Time High Proximity",
    shortLabel: "ATH Proximity",
    description:
      "Measures how close price is to the all-time high to gauge breakout vs. rejection risk.",
    category: "structure",
    defaultWeight: 2,
    timeframes: ["30m", "4h", "D"],
    tags: ["ATH", "structure", "level"],
    inputs: ["distanceToATH", "athLevel"],
    notes:
      "You can treat this as potential magnet + liquidity area; confluence with flow / sweeps is strong.",
  },
  {
    id: "recent_swing_high_low",
    label: "Recent Swing Highs / Lows",
    shortLabel: "Swings",
    description:
      "Tracks key recent swing highs and lows as natural support/resistance and liquidity pools.",
    category: "structure",
    defaultWeight: 2,
    timeframes: ["5m", "15m", "30m"],
    tags: ["structure", "liquidity", "levels"],
    inputs: ["swingHighs", "swingLows"],
    notes:
      "These are the obvious stops for retail; sweeps beyond them often matter for entries/exits.",
  },
];

// Session concepts (Asia / London / NY)
const sessionConcepts: AlgoConcept[] = [
  {
    id: "asia_session_range",
    label: "Asia Session Range",
    shortLabel: "Asia Range",
    description:
      "Tracks the Asia session high and low as a box that often acts as liquidity / range for NY.",
    category: "session",
    defaultWeight: 2,
    timeframes: ["15m", "30m"],
    tags: ["Asia", "session", "range"],
    inputs: ["asiaHigh", "asiaLow"],
    notes:
      "You like using Asia range as the first major box of the day; sweeps of these levels can set up NY moves.",
    references: ["ICT"],
  },
  {
    id: "london_session_range",
    label: "London Session Range",
    shortLabel: "London Range",
    description:
      "Tracks London session high and low for additional intraday structure and liquidity.",
    category: "session",
    defaultWeight: 2,
    timeframes: ["5m", "15m", "30m"],
    tags: ["London", "session", "range"],
    inputs: ["londonHigh", "londonLow"],
    notes:
      "London expansion can set the day’s bias; NY often trades back into or away from this range.",
    references: ["ICT"],
  },
  {
    id: "ny_initial_balance",
    label: "New York Initial Balance",
    shortLabel: "NY IB",
    description:
      "First hour of NY session as a key range to watch for breakouts / failures.",
    category: "session",
    defaultWeight: 1,
    timeframes: ["1m", "3m", "5m"],
    tags: ["NY", "session", "range"],
    inputs: ["nyIbHigh", "nyIbLow"],
    notes:
      "Can be used for simple breakout logic or as another range to be swept and reversed.",
  },
];

// Liquidity concepts (sweeps, stops, etc.)
const liquidityConcepts: AlgoConcept[] = [
  {
    id: "asia_high_liquidity_sweep",
    label: "Liquidity Sweep Above Asia High",
    shortLabel: "Asia High Sweep",
    description:
      "Price spikes above Asia high to grab liquidity and then returns back inside the range.",
    category: "liquidity",
    defaultWeight: 3,
    timeframes: ["1m", "3m", "5m"],
    tags: ["liquidity", "sweep", "Asia"],
    inputs: ["asiaHigh", "recentHighs", "sweepDetection"],
    notes:
      "Classic ICT-style sweep: wick through Asia high, close back inside. Often used as a reversal or continuation cue.",
    references: ["ICT"],
  },
  {
    id: "london_low_liquidity_sweep",
    label: "Liquidity Sweep Below London Low",
    shortLabel: "London Low Sweep",
    description:
      "Price dips below London low to grab stops then snaps back above.",
    category: "liquidity",
    defaultWeight: 3,
    timeframes: ["1m", "3m", "5m"],
    tags: ["liquidity", "sweep", "London"],
    inputs: ["londonLow", "recentLows", "sweepDetection"],
    notes:
      "Good for looking for long setups when higher-timeframe bias is bullish.",
    references: ["ICT"],
  },
  {
    id: "fvg_imbalance_zones",
    label: "Fair Value Gaps / Imbalances",
    shortLabel: "FVG",
    description:
      "Tracks fair value gaps as magnets / reaction zones for price.",
    category: "liquidity",
    defaultWeight: 2,
    timeframes: ["5m", "15m", "30m"],
    tags: ["FVG", "imbalance", "ICT"],
    inputs: ["fvgZones"],
    notes:
      "Pullbacks into FVGs in direction of higher-timeframe trend can be high-quality entries.",
    references: ["ICT"],
  },
];

// Momentum / multi-timeframe confluence
const momentumConcepts: AlgoConcept[] = [
  {
    id: "multi_timeframe_trend_stack",
    label: "Multi-Timeframe Trend Stack",
    shortLabel: "MTF Trend",
    description:
      "Checks if multiple timeframes (e.g., 5m/15m/30m/4h) all align bullish or bearish.",
    category: "momentum",
    defaultWeight: 3,
    timeframes: ["5m", "15m", "30m", "4h"],
    tags: ["confluence", "trend", "MTF"],
    inputs: ["timeframeBiasMap"],
    notes:
      "When most of your tracked timeframes agree, entries in that direction get a large boost in score.",
  },
  {
    id: "impulse_vs_pullback",
    label: "Impulse vs. Pullback Structure",
    shortLabel: "Impulse/PB",
    description:
      "Differentiates between strong impulsive moves and corrective pullbacks.",
    category: "momentum",
    defaultWeight: 2,
    timeframes: ["1m", "3m", "5m", "15m"],
    tags: ["momentum", "structure"],
    inputs: ["priceVelocity", "swingStructure"],
    notes:
      "Avoid longing into a fresh impulse candle; prefer entries on controlled pullbacks into key levels.",
  },
];

// Options flow concepts
const flowConcepts: AlgoConcept[] = [
  {
    id: "call_sweep_into_resistance",
    label: "Call Sweep Into Resistance",
    shortLabel: "Call Sweep @Res",
    description:
      "Aggressive call flow slamming into a known resistance area or ATH.",
    category: "flow",
    defaultWeight: 2,
    timeframes: ["1m", "3m", "5m"],
    tags: ["flow", "calls", "resistance"],
    inputs: ["flowCallNotional", "flowAggression", "keyLevels"],
    notes:
      "Can be exhaustion if technicals say extended; or continuation if it aligns with strong uptrend.",
  },
  {
    id: "put_sweep_into_support",
    label: "Put Sweep Into Support",
    shortLabel: "Put Sweep @Sup",
    description:
      "Heavy put flow smashing into strong support, swing low, or FVG.",
    category: "flow",
    defaultWeight: 2,
    timeframes: ["1m", "3m", "5m"],
    tags: ["flow", "puts", "support"],
    inputs: ["flowPutNotional", "flowAggression", "keyLevels"],
    notes:
      "Could be capitulation or confirmation of breakdown; use higher-timeframe bias to interpret.",
  },
  {
    id: "unusual_whales_high_impact_flow",
    label: "High-Impact Unusual Flow Cluster",
    shortLabel: "UW Cluster",
    description:
      "Cluster of unusual sweeps/blocks in a short time window pointing in the same direction.",
    category: "flow",
    defaultWeight: 3,
    timeframes: ["1m", "3m", "5m", "15m"],
    tags: ["flow", "cluster", "unusual"],
    inputs: ["flowClusterScore"],
    notes:
      "This is where the Unusual Whales-style data comes in. You can feed in a pre-computed cluster score here.",
  },
];

// News concepts
const newsConcepts: AlgoConcept[] = [
  {
    id: "macro_high_impact_news",
    label: "High-Impact Macro News Window",
    shortLabel: "Macro News",
    description:
      "Flags times around FOMC, CPI, jobs data, etc., where volatility and whipsaws spike.",
    category: "news",
    defaultWeight: 2,
    timeframes: ["1m", "3m", "5m", "15m"],
    tags: ["news", "macro", "risk"],
    inputs: ["isHighImpactNewsWindow"],
    notes:
      "You said you want a toggle: this concept can be turned on/off so news can either affect the algo or just be displayed.",
  },
];

// Risk / meta concepts
const riskConcepts: AlgoConcept[] = [
  {
    id: "max_daily_loss_guardrail",
    label: "Max Daily Loss Guardrail",
    shortLabel: "Daily Max Loss",
    description:
      "Tracks whether your daily loss limit is hit and should stop new entries.",
    category: "risk",
    defaultWeight: 3,
    timeframes: ["1m"],
    tags: ["risk", "guardrail"],
    inputs: ["realizedPnlToday", "maxDailyLoss"],
    notes:
      "Rather than a “setup,” this acts as a hard brake on further trades when your limit is reached.",
  },
  {
    id: "time_of_day_filter",
    label: "Time-of-Day Filter",
    shortLabel: "TOD Filter",
    description:
      "Weights setups differently in open, midday chop, and power hour.",
    category: "risk",
    defaultWeight: 1,
    timeframes: ["1m", "3m", "5m"],
    tags: ["time", "filter"],
    inputs: ["currentSessionSegment"],
    notes:
      "You may want to avoid certain times completely (e.g., random midday) or down-weight them.",
  },
];

// Fun / meta “What would TJR do?”
const metaConcepts: AlgoConcept[] = [
  {
    id: "tjr_style_bias",
    label: "TJR Style Bias Snapshot",
    shortLabel: "TJR Bias",
    description:
      "A side panel flavor: shows what a TJR-style play might be here based on your own rule encoding.",
    category: "meta",
    defaultWeight: 0,
    timeframes: ["1m", "3m", "5m", "15m"],
    tags: ["TJR", "fun", "meta"],
    inputs: ["tjrRuleEngineOutput"],
    notes:
      "Doesn’t have to drive the main algo; more like a commentary bubble. You can calculate this from a separate ruleset.",
    references: ["TJR"],
  },
];

// --------------------------------------------------------
// Combined Dictionary
// --------------------------------------------------------

export const SPICE_DICTIONARY: AlgoConcept[] = [
  ...trendConcepts,
  ...structureConcepts,
  ...sessionConcepts,
  ...liquidityConcepts,
  ...momentumConcepts,
  ...flowConcepts,
  ...newsConcepts,
  ...riskConcepts,
  ...metaConcepts,
];

// Quick lookup map by id
export const SPICE_DICTIONARY_BY_ID: Record<AlgoConceptId, AlgoConcept> =
  SPICE_DICTIONARY.reduce((acc, concept) => {
    acc[concept.id as AlgoConceptId] = concept;
    return acc;
  }, {} as Record<AlgoConceptId, AlgoConcept>);

// Helper: get a concept by id safely
export function getConcept(id: AlgoConceptId): AlgoConcept {
  return SPICE_DICTIONARY_BY_ID[id];
}

// Helper: filter concepts by category (for UI sections, etc.)
export function getConceptsByCategory(
  category: AlgoConceptCategory
): AlgoConcept[] {
  return SPICE_DICTIONARY.filter((c) => c.category === category);
}
