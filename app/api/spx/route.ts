import { NextResponse } from "next/server";

const TICKER = "I:SPX"; 
// ⬆️ IMPORTANT:
// Change this to match whatever ticker you are using
// in app/api/polygon/candles/route.ts (could be "SPX", "I:SPX", "SPY", etc.)

export async function GET() {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing POLYGON_API_KEY env var" },
      { status: 500 }
    );
  }

  try {
    // Use 1-minute aggregates and grab the most recent candle
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour back just to be safe

    const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
      TICKER
    )}/range/1/minute/${from}/${to}?limit=1&sort=desc&apiKey=${apiKey}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Polygon HTTP ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    const results = data?.results;
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: "No results in Polygon aggregate response", raw: data },
        { status: 502 }
      );
    }

    const lastCandle = results[0];
    const price = lastCandle?.c; // candle close

    if (typeof price !== "number") {
      return NextResponse.json(
        { error: "No numeric close price in Polygon response", raw: data },
        { status: 502 }
      );
    }

    return NextResponse.json({ price });
  } catch (err) {
    console.error("Polygon price (aggs) error:", err);
    return NextResponse.json(
      { error: "Failed to fetch from Polygon aggregates" },
      { status: 500 }
    );
  }
}
