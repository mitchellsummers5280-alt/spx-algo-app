// app/api/spx/price/route.ts
import { NextResponse } from "next/server";

const TICKER = "I:SPX";

export async function GET() {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing POLYGON_API_KEY env var" },
      { status: 500 }
    );
  }

  // Use the endpoint that works for your key/plan and for indices
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
    TICKER
  )}/prev?adjusted=true&apiKey=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Polygon HTTP ${res.status}`, details: text.slice(0, 300) },
        { status: 502 }
      );
    }

    const data = await res.json();

    const price =
      typeof data?.results?.[0]?.c === "number" ? data.results[0].c : null;

    const t =
      typeof data?.results?.[0]?.t === "number" ? data.results[0].t : null;

    if (price == null) {
      return NextResponse.json(
        { error: "No close price in Polygon response", raw: data },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ticker: TICKER,
      price,
      t,
      source: "polygon_aggs_prev",
    });
  } catch (err) {
    console.error("Polygon price route error:", err);
    return NextResponse.json(
      { error: "Failed to fetch from Polygon" },
      { status: 500 }
    );
  }
}
