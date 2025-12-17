// app/api/es/price/route.ts
import { NextResponse } from "next/server";
import { fetchFuturesAggs } from "@/lib/providers/esFutures";

const ES_TICKER = process.env.ES_TICKER || "ES1!";

export async function GET() {
  try {
    const now = Date.now();
    const fromMs = now - 10 * 60_000; // last 10 minutes
    const toMs = now;

    const candles = await fetchFuturesAggs({
      ticker: ES_TICKER,
      fromMs,
      toMs,
      timespan: "minute",
      multiplier: 1,
      limit: 5000,
    });

    const last = candles.length ? candles[candles.length - 1] : null;
    const price = last?.c ?? null;

    return NextResponse.json({
      ticker: ES_TICKER,
      price,
      source: "1m_agg_close",
      lastCandleTs: last?.t ?? null,
      count: candles.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ticker: ES_TICKER, error: e?.message ?? "ES price error" },
      { status: 500 }
    );
  }
}
