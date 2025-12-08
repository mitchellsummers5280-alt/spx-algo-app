// app/api/spx/route.ts

import { NextResponse } from "next/server";
import { fetchSpxAggregates } from "@/lib/marketData/polygon";
import { generateMockSpxCandles } from "@/lib/marketData/mockSpx";
import { Timeframe } from "@/lib/marketData/types";

// Simple helper so we can parse query params
function getSearchParam(url: string, key: string): string | null {
  return new URL(url).searchParams.get(key);
}

export async function GET(req: Request) {
  const { url } = req;
  const tfParam = (getSearchParam(url, "tf") ?? "1m") as Timeframe;
  const barsParam = parseInt(getSearchParam(url, "bars") ?? "500", 10);

  // For quick dev, we just pull ~N bars over the last few days
  // in a way that's "good enough" for testing.
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 5); // last 5 days

  try {
    const havePolygonKey =
      !!process.env.POLYGON_API_KEY &&
      process.env.POLYGON_API_KEY !== "YOUR_POLYGON_KEY_GOES_HERE";

    if (!havePolygonKey) {
      // Mock mode until you sign up for Polygon
      const mock = generateMockSpxCandles({
        timeframe: tfParam,
        bars: barsParam,
      });
      return NextResponse.json(
        { mode: "mock", timeframe: tfParam, candles: mock },
        { status: 200 }
      );
    }

    // Real Polygon data mode
    const candles = await fetchSpxAggregates({
      timeframe: tfParam,
      from: from.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    });

    // If Polygon returns lots of bars, trim to requested count from the end
    const trimmed =
      candles.length > barsParam
        ? candles.slice(candles.length - barsParam)
        : candles;

    return NextResponse.json(
      { mode: "polygon", timeframe: tfParam, candles: trimmed },
      { status: 200 }
    );
  } catch (err) {
    console.error("SPX API route error:", err);
    return NextResponse.json(
      { error: "Failed to fetch SPX data" },
      { status: 500 }
    );
  }
}
