// app/api/spx/price/route.ts
import { NextResponse } from "next/server";

const TICKER = "SPX"; // or "SPX.X" / "SPXW" if your Polygon plan uses a different symbol

export async function GET() {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing POLYGON_API_KEY env var" },
      { status: 500 }
    );
  }

  try {
    const url = `https://api.polygon.io/v2/last/trade/${encodeURIComponent(
      TICKER
    )}?apiKey=${apiKey}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Polygon HTTP ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Polygon can return slightly different shapes depending on endpoint
    const price =
      data?.results?.p ?? // typical "last trade" format
      data?.last?.price ?? // some legacy formats
      null;

    if (typeof price !== "number") {
      return NextResponse.json(
        { error: "No price in Polygon response", raw: data },
        { status: 502 }
      );
    }

    return NextResponse.json({ price });
  } catch (err) {
    console.error("Polygon price error:", err);
    return NextResponse.json(
      { error: "Failed to fetch from Polygon" },
      { status: 500 }
    );
  }
}
