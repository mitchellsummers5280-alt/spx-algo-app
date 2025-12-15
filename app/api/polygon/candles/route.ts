// app/api/polygon/candles/route.ts
import { NextResponse } from "next/server";

type Candle = { t: number; o: number; h: number; l: number; c: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseTf(tf: string | null): { mult: number; span: string } | null {
  if (!tf) return null;
  const s = tf.trim().toLowerCase();

  // supported: 1m 3m 5m 15m 30m 4h
  if (s.endsWith("m")) {
    const mult = Number(s.slice(0, -1));
    if ([1, 3, 5, 15, 30].includes(mult)) return { mult, span: "minute" };
  }
  if (s.endsWith("h")) {
    const mult = Number(s.slice(0, -1));
    if ([1, 2, 4].includes(mult)) return { mult, span: "hour" };
  }
  return null;
}

function parseLookbackMs(v: string | null): number | null {
  if (!v) return null;
  const s = v.trim().toLowerCase();

  // allow plain number = hours
  if (/^\d+(\.\d+)?$/.test(s)) {
    const hours = Number(s);
    if (!Number.isFinite(hours) || hours <= 0) return null;
    return Math.floor(hours * 60 * 60 * 1000);
  }

  // formats: 24h, 6h, 1d, 2w
  const m = s.match(/^(\d+(?:\.\d+)?)([hdw])$/);
  if (!m) return null;

  const qty = Number(m[1]);
  const unit = m[2];
  if (!Number.isFinite(qty) || qty <= 0) return null;

  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const week = 7 * day;

  if (unit === "h") return Math.floor(qty * hour);
  if (unit === "d") return Math.floor(qty * day);
  if (unit === "w") return Math.floor(qty * week);

  return null;
}

export async function GET(req: Request) {
  try {
    const key = process.env.POLYGON_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Missing POLYGON_API_KEY" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Defaults
    const ticker = searchParams.get("ticker") ?? "I:SPX";

    // ✅ NEW: allow tf=1m/5m/etc
    const tfParsed = parseTf(searchParams.get("tf"));

    // Keep your existing params too
    const multiplier = tfParsed?.mult ?? Number(searchParams.get("mult") ?? "1");
    const timespan = tfParsed?.span ?? (searchParams.get("span") ?? "minute");

    // ✅ NEW: lookback rolling window (preferred for seeding)
    // also support days=1 convenience
    const daysParam = searchParams.get("days");
    const lookbackMs =
      parseLookbackMs(searchParams.get("lookback")) ??
      (daysParam ? Number(daysParam) * 24 * 60 * 60 * 1000 : null);

    // Optional hard overrides
    const fromParam = searchParams.get("from"); // can be yyyy-mm-dd OR epoch ms string
    const toParam = searchParams.get("to"); // same

    const nowMs = Date.now();

    // Determine from/to
    let from: string;
    let to: string;

    if (fromParam && toParam) {
      // Caller supplied explicit range — pass through
      from = fromParam;
      to = toParam;
    } else if (lookbackMs != null && Number.isFinite(lookbackMs)) {
      // Rolling window: use epoch ms for precision
      const lb = clamp(lookbackMs, 1 * 60 * 60 * 1000, 30 * 24 * 60 * 60 * 1000); // 1h..30d
      from = String(nowMs - lb);
      to = String(nowMs);
    } else {
      // Fallback behavior: if minute candles, default to last 1d; otherwise 10d
      const defaultMs =
        timespan === "minute" && multiplier === 1
          ? 24 * 60 * 60 * 1000
          : 10 * 24 * 60 * 60 * 1000;

      from = String(nowMs - defaultMs);
      to = String(nowMs);
    }

    // Limit control (Polygon max is high; keep safe)
    const limitParam = Number(searchParams.get("limit") ?? "50000");
    const limit = clamp(
      Number.isFinite(limitParam) ? limitParam : 50000,
      1,
      50000
    );

    const url =
      `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(
        ticker
      )}/range/${multiplier}/${timespan}/${from}/${to}` +
      `?adjusted=true&sort=asc&limit=${limit}&apiKey=${encodeURIComponent(key)}`;

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

    return NextResponse.json({
      ticker,
      mult: multiplier,
      span: timespan,
      from,
      to,
      candles,
      updated: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
