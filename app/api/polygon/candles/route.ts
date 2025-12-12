// app/api/polygon/candles/route.ts
import { NextResponse } from "next/server";

// Massive REST base URL
const MASSIVE_BASE_URL = "https://api.massive.com";

// Massive index ticker for S&P 500
const INDEX_TICKER = "I:SPX";

export async function GET() {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing POLYGON_API_KEY in environment" },
      { status: 500 }
    );
  }

  try {
    // Use today's date in UTC for intraday 1-minute bars
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const today = `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD

    const url = new URL(
      `${MASSIVE_BASE_URL}/v2/aggs/ticker/${encodeURIComponent(
        INDEX_TICKER
      )}/range/1/minute/${today}/${today}`
    );

    url.searchParams.set("sort", "asc");
    url.searchParams.set("limit", "5000");
    url.searchParams.set("apiKey", apiKey);

    const res = await fetch(url.toString(), { cache: "no-store" });
    const data = await res.json();

    // Massive-style error handling
    if (!res.ok || data.status === "ERROR" || data.error) {
      console.error("Massive aggregates error:", data);
      return NextResponse.json(
        {
          error: "Massive fetch failed",
          details: JSON.stringify(data),
        },
        { status: 500 }
      );
    }

    // Pass Massive response straight through to the client
    return NextResponse.json({
      candles: data.results ?? [],
      updated: Date.now(),
    });
  } catch (err: any) {
    console.error("Massive fetch exception:", err);
    return NextResponse.json(
      {
        error: "Massive fetch failed",
        details: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}
