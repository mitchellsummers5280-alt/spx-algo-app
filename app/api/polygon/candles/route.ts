// app/api/polygon/candles/route.ts
import { NextResponse } from "next/server";

type Candle = { t: number; o: number; h: number; l: number; c: number };

function yyyymmdd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(req: Request) {
  try {
    const key = process.env.POLYGON_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "Missing POLYGON_API_KEY" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);

    // Defaults that work reliably for SPX index candles on Polygon
    const ticker = searchParams.get("ticker") ?? "I:SPX";
    const multiplier = Number(searchParams.get("mult") ?? "1");
    const timespan = searchParams.get("span") ?? "minute";

    // Rolling window so weekends/holidays still return candles (e.g., Friday)
    const now = new Date();
    const fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 10);

    const from = searchParams.get("from") ?? yyyymmdd(fromDate);
    const to = searchParams.get("to") ?? yyyymmdd(now);

    const url =
      `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
        ticker
      )}/range/${multiplier}/${timespan}/${from}/${to}` +
      `?adjusted=true&sort=asc&limit=50000&apiKey=${encodeURIComponent(key)}`;

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: "Polygon aggregates failed", status: res.status, data },
        { status: 500 }
      );
    }

    const results = Array.isArray(data?.results) ? data.results : [];
    const candles: Candle[] = results.map((r: any) => ({
      t: r.t,
      o: r.o,
      h: r.h,
      l: r.l,
      c: r.c,
    }));

    return NextResponse.json({ ticker, from, to, candles, updated: Date.now() });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
