// app/api/es/candles/route.ts
import { NextResponse } from "next/server";
import { fetchFuturesAggs } from "@/lib/providers/esFutures";

type Candle = { t: number; o: number; h: number; l: number; c: number };

function parseISO(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? v : null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // Example:
    // /api/es/candles?ticker=ESM5&from=2025-12-16T00:00:00.000Z&to=2025-12-16T06:00:00.000Z
    const ticker = url.searchParams.get("ticker") || "ESM5";

    const fromISO = parseISO(url.searchParams.get("from"));
    const toISO = parseISO(url.searchParams.get("to"));

    if (!fromISO || !toISO) {
      return NextResponse.json(
        { error: "Missing or invalid 'from'/'to' ISO params." },
        { status: 400 }
      );
    }

    // Massive returns window_start in *nanoseconds* (per what we saw).
    // Normalize to ms for SPICE candleStore.
    const rows = await fetchFuturesAggs({
      ticker,
      fromISO,
      toISO,
      timespan: "minute",
      multiplier: 1,
      limit: 50000,
    });

    const candles: Candle[] = rows.map((r: any) => {
      const ns = Number(r.window_start);
      const t = Number.isFinite(ns) ? Math.floor(ns / 1_000_000) : Date.now();
      return {
        t,
        o: Number(r.open),
        h: Number(r.high),
        l: Number(r.low),
        c: Number(r.close),
      };
    });

    return NextResponse.json({
      ticker,
      from: fromISO,
      to: toISO,
      count: candles.length,
      candles,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "ES candles error" },
      { status: 500 }
    );
  }
}
