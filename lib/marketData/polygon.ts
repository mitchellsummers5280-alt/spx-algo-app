// lib/marketData/polygon.ts

import { RawCandle, SpiceCandle, Timeframe } from "./types";

// TODO: adjust base URL if Polygon updates docs;
// current indices + aggregates design uses the "I:SPX" symbol pattern.
const POLYGON_BASE = "https://api.polygon.io";

const TIMEFRAME_TO_POLYGON = {
  "1m": { multiplier: 1, timespan: "minute" },
  "3m": { multiplier: 3, timespan: "minute" },
  "5m": { multiplier: 5, timespan: "minute" },
  "15m": { multiplier: 15, timespan: "minute" },
  "30m": { multiplier: 30, timespan: "minute" },
  "1h": { multiplier: 60, timespan: "minute" },
  "4h": { multiplier: 4, timespan: "hour" },
} as const;

export type PolygonAggsResponse = {
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted: boolean;
  results?: RawCandle[];
  status: string;
  request_id: string;
  count: number;
};

/**
 * Fetch SPX index candles via Polygon indices aggregates.
 * Ticker format for indices uses "I:SPX".
 */
export async function fetchSpxAggregates(options: {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  timeframe: Timeframe;
}): Promise<SpiceCandle[]> {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey || apiKey === "YOUR_POLYGON_KEY_GOES_HERE") {
    throw new Error(
      "POLYGON_API_KEY is not set. Use mock data until your account is ready."
    );
  }

  const tf = TIMEFRAME_TO_POLYGON[options.timeframe];

  if (!tf) {
    throw new Error(`Unsupported timeframe: ${options.timeframe}`);
  }

  // Indices use "I:" prefix, e.g. "I:SPX" for the S&P 500 index.
  // We request aggregates (candles) over the given date range.
  const url = new URL(
    `/v2/aggs/ticker/I:SPX/range/${tf.multiplier}/${tf.timespan}/${options.from}/${options.to}`,
    POLYGON_BASE
  );

  url.searchParams.set("adjusted", "true");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", "50000");
  url.searchParams.set("apiKey", apiKey);

  const res = await fetch(url.toString());

  if (!res.ok) {
    const text = await res.text();
    console.error("Polygon error:", res.status, text);
    throw new Error(`Polygon API error: ${res.status}`);
  }

  const json = (await res.json()) as PolygonAggsResponse;

  if (json.status !== "OK" || !json.results) {
    console.error("Unexpected Polygon response:", json);
    throw new Error("Polygon returned no results");
  }

  return json.results.map((bar) => ({
    time: Math.floor(bar.t / 1000), // convert ms → seconds for chart lib
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  }));
}
