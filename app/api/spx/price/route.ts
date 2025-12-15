// app/api/spx/price/route.ts
import { NextResponse } from "next/server";

const POLYGON_KEY = process.env.POLYGON_API_KEY;

const SPX_TICKER = "I:SPX";
const PROXY_TICKER = "SPY";

type PricePayload = {
  ticker: string;
  price: number | null;
  t: number | null;
  source: string;
  note?: string;
  error?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __spice_lastPrice: PricePayload | undefined;
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });

  // If Polygon is rate-limiting, preserve status for caller
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Polygon fetch failed (${res.status}) ${text}`);
  }

  return res.json();
}

function ymdET() {
  // good-enough for “today” in ET for market hours
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function getAgg1mLast(ticker: string): Promise<PricePayload> {
  const dateStr = ymdET();
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
    ticker
  )}/range/1/minute/${dateStr}/${dateStr}?adjusted=true&sort=desc&limit=1&apiKey=${POLYGON_KEY}`;

  const data = await fetchJson(url);
  const r0 = Array.isArray(data?.results) ? data.results[0] : null;

  const price =
    typeof r0?.c === "number" ? r0.c : typeof r0?.o === "number" ? r0.o : null;

  const t = typeof r0?.t === "number" ? r0.t : null;

  return { ticker, price, t, source: `${ticker}_aggs_1m_last` };
}

async function getPrevAgg(ticker: string): Promise<PricePayload> {
  const url = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
    ticker
  )}/prev?adjusted=true&apiKey=${POLYGON_KEY}`;

  const data = await fetchJson(url);
  const r0 = Array.isArray(data?.results) ? data.results[0] : null;

  const price =
    typeof r0?.c === "number" ? r0.c : typeof r0?.o === "number" ? r0.o : null;

  const t = typeof r0?.t === "number" ? r0.t : null;

  return { ticker, price, t, source: `${ticker}_aggs_prev` };
}

export async function GET() {
  try {
    if (!POLYGON_KEY) {
      return NextResponse.json(
        { error: "Missing POLYGON_API_KEY" },
        { status: 500 }
      );
    }

    // 1) Try SPX 1m last bar (best when allowed)
    try {
      const spx1m = await getAgg1mLast(SPX_TICKER);
      if (spx1m.price != null && !Number.isNaN(spx1m.price)) {
        globalThis.__spice_lastPrice = spx1m;
        return NextResponse.json(spx1m);
      }
    } catch {
      // ignore and fall through
    }

    // 2) Fallback: SPY 1m last bar (proxy)
    try {
      const spy1m = await getAgg1mLast(PROXY_TICKER);
      if (spy1m.price != null && !Number.isNaN(spy1m.price)) {
        const proxy: PricePayload = {
          ticker: SPX_TICKER,
          price: spy1m.price,
          t: spy1m.t,
          source: "proxy_spy_1m",
          note: "SPX 1m not available; proxying from SPY 1m close",
        };
        globalThis.__spice_lastPrice = proxy;
        return NextResponse.json(proxy);
      }
    } catch {
      // ignore and fall through
    }

    // 3) Fallback: SPX prev
    try {
      const spxPrev = await getPrevAgg(SPX_TICKER);
      globalThis.__spice_lastPrice = spxPrev;
      return NextResponse.json(spxPrev);
    } catch {
      // ignore and fall through
    }

    // 4) Last resort: return last known good (prevents price going null)
    if (globalThis.__spice_lastPrice) {
      return NextResponse.json({
        ...globalThis.__spice_lastPrice,
        note: "Returning last-known price (Polygon blocked/rate-limited)",
      });
    }

    return NextResponse.json(
      { ticker: SPX_TICKER, price: null, t: null, source: "none" },
      { status: 503 }
    );
  } catch (err: any) {
    // never leak key / urls
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
