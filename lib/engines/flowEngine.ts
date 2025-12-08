// lib/engines/flowEngine.ts

// ------------------------------------------------------------
// SPICE Flow Engine (Unusual Whales)
// ------------------------------------------------------------
//
// What this file does:
// - Fetches "flow alerts" from the Unusual Whales API
// - Normalizes each trade into a SPICE-friendly FlowEvent
// - Aggregates into a FlowSnapshot with a -1..+1 flowScore
// - Falls back to mock data if UW_API_KEY is missing or in dev
//
// IMPORTANT:
// - Field names from the Unusual Whales API here are *educated guesses*
//   based on their docs & examples. You MUST confirm against the
//   official docs at https://api.unusualwhales.com/docs and adjust
//   RawUwFlowTrade + normalizeUwFlowTrade as needed.
// - Make sure your usage complies with their API Terms of Service.
//
// ------------------------------------------------------------

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

// Direction after our processing (SPICE-friendly)
export type FlowDirection = "bullish" | "bearish" | "neutral";

// Normalized event SPICE will use
export interface FlowEvent {
  id: string;
  symbol: string;
  timestamp: string; // ISO string
  direction: FlowDirection;
  optionType: "call" | "put" | "unknown";
  expiry: string | null; // ISO date, if known
  strike: number | null;
  premium: number; // total notional premium in USD
  size: number | null; // contracts
  isSweep: boolean;
  isBlock: boolean;
  dte: number | null; // days to expiry if provided
  spotPrice: number | null;
  // Full raw payload in case we need to debug or add features later
  raw: RawUwFlowTrade;
}

// Aggregated snapshot for one symbol (e.g. SPX)
export interface FlowSnapshotTotals {
  bullishPremium: number;
  bearishPremium: number;
  bullishCount: number;
  bearishCount: number;
  netPremium: number; // bullish - bearish
  totalPremium: number; // bullish + bearish
  flowScore: number; // -1 (max bearish) to +1 (max bullish)
}

export interface FlowSnapshot {
  symbol: string;
  asOf: string; // ISO timestamp when we computed this
  events: FlowEvent[];
  totals: FlowSnapshotTotals;
}

// Engine config for fetching + scoring
export interface FlowEngineConfig {
  symbol: string; // "SPX", "SPY", etc. (for you: probably "SPX" or "SPXW")
  limit?: number; // max number of flow alerts to pull (default 200)
  minPremium?: number; // filter: minimum trade premium in USD (e.g. 100000)
  minDte?: number; // minimum days to expiry (e.g. 0 or 1)
  maxDte?: number; // maximum days to expiry (e.g. 7 for scalping)
  useMockData?: boolean; // force mock data (for local dev)
}

// ------------------------------------------------------------
// Raw Unusual Whales types (approximate)
// ------------------------------------------------------------
//
// These fields are based on their flow feed docs + examples of the
// /option-trades/flow-alerts endpoint. You may need to tweak names:
// see: https://unusualwhales.com/public-api and the flow alerts examples.
//
// The *shape* is not critical for SPICE as long as normalizeUwFlowTrade()
// returns a good FlowEvent. Adjust this to match your actual JSON.
//

export interface RawUwFlowTrade {
  // Common fields (names may differ, adjust as needed)
  id?: string | number;
  ticker?: string; // underlying ticker, e.g. "SPX"
  symbol?: string; // sometimes used instead of ticker
  underlying_symbol?: string;

  time?: string; // ISO timestamp, or unix ms / s
  ts?: number; // fallback timestamp field

  option_type?: "CALL" | "PUT" | string;
  side?: "ask" | "bid" | "mid" | "none" | string;

  expiry?: string; // "2025-12-19"
  expiration?: string;
  strike?: number;
  strike_price?: number;

  premium?: number; // total premium in USD
  notional?: number;
  size?: number;
  contracts?: number;

  is_sweep?: boolean;
  is_block?: boolean;

  dte?: number; // days to expiry if provided
  spot?: number;
  stock_price?: number;

  // Catch-all
  [key: string]: unknown;
}

// ------------------------------------------------------------
// Config
// ------------------------------------------------------------

export const UW_API_BASE_URL = "https://api.unusualwhales.com";

// NOTE: They may use a specific auth scheme like Bearer tokens or
// a custom header. Check their docs and update this accordingly.
function buildUwHeaders(apiKey: string): HeadersInit {
  return {
    // If docs say Bearer:
    // Authorization: `Bearer ${apiKey}`,
    // If docs say x-api-key:
    // "x-api-key": apiKey,
    Authorization: `Bearer ${apiKey}`, // <- adjust if needed
    Accept: "application/json",
  };
}

// ------------------------------------------------------------
// Public API: main entry point for SPICE
// ------------------------------------------------------------

/**
 * Fetch and score options flow for a given symbol.
 *
 * Typical usage in the SPICE aggregator:
 *   const flowSnapshot = await getFlowSnapshot({ symbol: "SPX", minPremium: 100000 });
 *   const flowScore = flowSnapshot.totals.flowScore;
 */
export async function getFlowSnapshot(
  config: FlowEngineConfig
): Promise<FlowSnapshot> {
  const symbol = config.symbol.toUpperCase();
  const useMock =
    config.useMockData || !process.env.UW_API_KEY || process.env.NODE_ENV === "development";

  if (useMock) {
    return buildMockFlowSnapshot(symbol);
  }

  const apiKey = process.env.UW_API_KEY;
  if (!apiKey) {
    // Safety fallback – should be unreachable if useMock logic above works.
    return buildMockFlowSnapshot(symbol);
  }

  // Build query params similar to the public examples:
  // GET https://api.unusualwhales.com/api/option-trades/flow-alerts?limit=200&min_premium=200000&min_dte=1 ...
  const params = new URLSearchParams();
  params.set("limit", String(config.limit ?? 200));
  if (typeof config.minPremium === "number") {
    params.set("min_premium", String(config.minPremium));
  }
  if (typeof config.minDte === "number") {
    params.set("min_dte", String(config.minDte));
  }
  if (typeof config.maxDte === "number") {
    params.set("max_dte", String(config.maxDte));
  }

  const url = `${UW_API_BASE_URL}/api/option-trades/flow-alerts?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: buildUwHeaders(apiKey),
    // tweak cache behaviour as you like; for live trading you'd likely disable
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("[SPICE flowEngine] UW API error:", response.status, response.statusText);
    return buildMockFlowSnapshot(symbol);
  }

  const json = (await response.json()) as unknown;

  // Many APIs use either `[ ... ]` or `{ data: [ ... ] }` patterns.
  let rawTrades: RawUwFlowTrade[] = [];
  if (Array.isArray(json)) {
    rawTrades = json as RawUwFlowTrade[];
  } else if (json && typeof json === "object" && Array.isArray((json as any).data)) {
    rawTrades = (json as any).data as RawUwFlowTrade[];
  } else {
    console.warn("[SPICE flowEngine] Unexpected UW API payload shape, using empty array.");
  }

  // Filter down to the symbol we care about, then normalize.
  const events: FlowEvent[] = rawTrades
    .filter((t) => isTradeForSymbol(t, symbol))
    .map((t) => normalizeUwFlowTrade(t, symbol))
    .filter((ev): ev is FlowEvent => ev !== null);

  return summarizeEvents(symbol, events);
}

// ------------------------------------------------------------
// Helpers: symbol filtering & normalization
// ------------------------------------------------------------

function isTradeForSymbol(trade: RawUwFlowTrade, symbol: string): boolean {
  const tSymbol =
    (trade.ticker as string | undefined) ??
    (trade.symbol as string | undefined) ??
    (trade.underlying_symbol as string | undefined);

  if (!tSymbol) return false;
  return tSymbol.toUpperCase() === symbol.toUpperCase();
}

function normalizeUwFlowTrade(
  trade: RawUwFlowTrade,
  symbol: string
): FlowEvent | null {
  // ID fallback combo
  const id =
    (trade.id !== undefined ? String(trade.id) : undefined) ??
    `${symbol}-${trade.time ?? trade.ts ?? Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Timestamp handling – adjust if your payload uses unix seconds or millis.
  let timestamp: string;
  if (typeof trade.time === "string") {
    timestamp = new Date(trade.time).toISOString();
  } else if (typeof trade.ts === "number") {
    // assume unix seconds if small, ms if large
    const assumedMs = trade.ts < 10_000_000_000 ? trade.ts * 1000 : trade.ts;
    timestamp = new Date(assumedMs).toISOString();
  } else {
    timestamp = new Date().toISOString();
  }

  const optionTypeRaw = (trade.option_type ?? "") as string;
  const optionType: "call" | "put" | "unknown" =
    optionTypeRaw.toUpperCase() === "CALL"
      ? "call"
      : optionTypeRaw.toUpperCase() === "PUT"
      ? "put"
      : "unknown";

  const sideRaw = (trade.side ?? "") as string;
  const sideLower = sideRaw.toLowerCase();

  const expiry =
    (trade.expiry as string | undefined) ??
    (trade.expiration as string | undefined) ??
    null;

  const strike =
    typeof trade.strike === "number"
      ? trade.strike
      : typeof trade.strike_price === "number"
      ? trade.strike_price
      : null;

  const premium =
    typeof trade.premium === "number"
      ? trade.premium
      : typeof trade.notional === "number"
      ? trade.notional
      : 0;

  const size =
    typeof trade.size === "number"
      ? trade.size
      : typeof trade.contracts === "number"
      ? trade.contracts
      : null;

  const isSweep = Boolean(trade.is_sweep);
  const isBlock = Boolean(trade.is_block);

  const dte =
    typeof trade.dte === "number" ? trade.dte : null;

  const spot =
    typeof trade.spot === "number"
      ? trade.spot
      : typeof trade.stock_price === "number"
      ? trade.stock_price
      : null;

  // Direction heuristic based on UW docs:
  // - Ask-side calls and bid-side puts → bullish
  // - Bid-side calls and ask-side puts → bearish :contentReference[oaicite:1]{index=1}
  let direction: FlowDirection = "neutral";
  if (optionType === "call") {
    if (sideLower === "ask") direction = "bullish";
    else if (sideLower === "bid") direction = "bearish";
  } else if (optionType === "put") {
    if (sideLower === "ask") direction = "bearish";
    else if (sideLower === "bid") direction = "bullish";
  }

  if (!premium || premium <= 0) {
    // If there's no real money behind it, we can drop it.
    // You can relax this if you want every single event.
    return null;
  }

  const event: FlowEvent = {
    id,
    symbol,
    timestamp,
    direction,
    optionType,
    expiry,
    strike,
    premium,
    size,
    isSweep,
    isBlock,
    dte,
    spotPrice: spot,
    raw: trade,
  };

  return event;
}

// ------------------------------------------------------------
// Aggregation & scoring
// ------------------------------------------------------------

function summarizeEvents(symbol: string, events: FlowEvent[]): FlowSnapshot {
  let bullishPremium = 0;
  let bearishPremium = 0;
  let bullishCount = 0;
  let bearishCount = 0;

  for (const ev of events) {
    if (ev.direction === "bullish") {
      bullishPremium += ev.premium;
      bullishCount += 1;
    } else if (ev.direction === "bearish") {
      bearishPremium += ev.premium;
      bearishCount += 1;
    }
  }

  const netPremium = bullishPremium - bearishPremium;
  const totalPremium = bullishPremium + bearishPremium;

  // Flow score in [-1, 1]; 0 = perfectly balanced
  const flowScore =
    totalPremium > 0 ? clampNumber(netPremium / totalPremium, -1, 1) : 0;

  const totals: FlowSnapshotTotals = {
    bullishPremium,
    bearishPremium,
    bullishCount,
    bearishCount,
    netPremium,
    totalPremium,
    flowScore,
  };

  return {
    symbol,
    asOf: new Date().toISOString(),
    events,
    totals,
  };
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(max, Math.max(min, value));
}

// ------------------------------------------------------------
// Mock data for local development
// ------------------------------------------------------------

function buildMockFlowSnapshot(symbol: string): FlowSnapshot {
  const now = new Date();

  const mockEvents: FlowEvent[] = [
    {
      id: `${symbol}-mock-1`,
      symbol,
      timestamp: now.toISOString(),
      direction: "bullish",
      optionType: "call",
      expiry: "2025-12-19",
      strike: 5100,
      premium: 250_000,
      size: 500,
      isSweep: true,
      isBlock: false,
      dte: 7,
      spotPrice: 5050,
      raw: {},
    },
    {
      id: `${symbol}-mock-2`,
      symbol,
      timestamp: now.toISOString(),
      direction: "bearish",
      optionType: "put",
      expiry: "2025-12-19",
      strike: 4950,
      premium: 150_000,
      size: 400,
      isSweep: false,
      isBlock: true,
      dte: 7,
      spotPrice: 5050,
      raw: {},
    },
    {
      id: `${symbol}-mock-3`,
      symbol,
      timestamp: now.toISOString(),
      direction: "bullish",
      optionType: "call",
      expiry: "2025-12-12",
      strike: 5080,
      premium: 90_000,
      size: 200,
      isSweep: true,
      isBlock: false,
      dte: 1,
      spotPrice: 5055,
      raw: {},
    },
  ];

  return summarizeEvents(symbol, mockEvents);
}
