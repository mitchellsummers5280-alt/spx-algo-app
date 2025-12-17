import { NextResponse } from "next/server";
import { fetchFuturesAggs } from "@/lib/providers/esFutures";

const CACHE_TTL_MS = 60_000;

type CacheEntry = { ts: number; body: any };
const g = globalThis as any;
g.__ES_SESSION_CACHE__ ??= new Map<string, CacheEntry>();
const cache: Map<string, CacheEntry> = g.__ES_SESSION_CACHE__;

// Convert NY wall time (YYYY-MM-DD + hh:mm ET) -> UTC epoch ms
function nyWallTimeToUtcMs(day: string, hh: number, mm: number) {
  const [y, m, d] = day.split("-").map(Number);

  const wall = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(
    2,
    "0"
  )} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;

  const ny = new Date(
    new Date(wall).toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const utc = new Date(new Date(wall).toLocaleString("en-US", { timeZone: "UTC" }));

  const offset = utc.getTime() - ny.getTime();
  return new Date(wall).getTime() + offset;
}

// day +/- N in YYYY-MM-DD
function addDays(day: string, delta: number) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // midday avoids DST edge issues
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function computeHiLo(bars: any[]) {
  let hi = -Infinity;
  let lo = Infinity;

  for (const b of bars) {
    const h = typeof b.h === "number" ? b.h : typeof b.high === "number" ? b.high : null;
    const l = typeof b.l === "number" ? b.l : typeof b.low === "number" ? b.low : null;
    if (h != null) hi = Math.max(hi, h);
    if (l != null) lo = Math.min(lo, l);
  }

  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return null;
  return { high: hi, low: lo };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const day = searchParams.get("day"); // NY day YYYY-MM-DD
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return NextResponse.json(
        { error: "Missing/invalid day. Expected YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const nocache = searchParams.get("nocache") === "1";

    // Resolve contract via your existing endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const r = await fetch(
      `${baseUrl}/api/es/resolve-contract?day=${encodeURIComponent(day)}&product_code=ES`,
      { cache: "no-store" }
    );
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error(`Resolve-contract failed (${r.status}): ${txt}`);
    }

    const resolved = await r.json();
    const resolvedTicker =
      resolved?.chosen?.ticker ||
      resolved?.chosen?.symbol ||
      resolved?.chosen?.contract_ticker;

    if (!resolvedTicker) throw new Error("No ES contract resolved (missing chosen.ticker)");
    const ticker = String(resolvedTicker).toUpperCase();

    const cacheKey = `${ticker}|${day}`;
    const hit = cache.get(cacheKey);
    if (!nocache && hit && Date.now() - hit.ts < CACHE_TTL_MS) {
      return NextResponse.json(hit.body);
    }

    // ✅ Session definitions you want:
    // Asia: 18:00 → 02:00 ET (crosses midnight, starts on previous calendar day)
    // London: 02:00 → 08:30 ET (same NY day)
    const prevDay = addDays(day, -1);

    const asiaFromMs = nyWallTimeToUtcMs(prevDay, 18, 0); // prev day 6:00 PM ET
    const asiaToMs = nyWallTimeToUtcMs(day, 2, 0);        // day 2:00 AM ET
    const londonFromMs = asiaToMs;                        // 2:00 AM ET
    const londonToMs = nyWallTimeToUtcMs(day, 8, 30);     // day 8:30 AM ET

    // One broad fetch: 6:00 PM prev day -> 8:30 AM day
    const fromMs = asiaFromMs;
    const toMs = londonToMs;

    const bars = await fetchFuturesAggs({
      ticker,
      fromMs,
      toMs,
      resolution: "1min",
      limit: 50000,
    });

    // Ensure ascending for predictable debug
    const sorted = [...bars].sort((a: any, b: any) => (a.t ?? 0) - (b.t ?? 0));

    const inRange = (t: number, a: number, b: number) => t >= a && t < b;

    const asiaBars = sorted.filter((b: any) => inRange(b.t, asiaFromMs, asiaToMs));
    const londonBars = sorted.filter((b: any) => inRange(b.t, londonFromMs, londonToMs));

    const asia = computeHiLo(asiaBars);
    const london = computeHiLo(londonBars);

    const body = {
      ok: true,
      day,
      ticker,
      resolvedFrom: resolved?.chosen ?? null,
      windows: {
        asia: { fromMs: asiaFromMs, toMs: asiaToMs },       // 6pm -> 2am
        london: { fromMs: londonFromMs, toMs: londonToMs }, // 2am -> 8:30am
      },
      counts: { total: sorted.length, asia: asiaBars.length, london: londonBars.length },
      asia,
      london,
      debugTs: {
        fromMs,
        toMs,
        firstTimeMs: sorted?.[0]?.t ?? null,
        lastTimeMs: sorted?.[sorted.length - 1]?.t ?? null,
      },
    };

    cache.set(cacheKey, { ts: Date.now(), body });
    return NextResponse.json(body);
  } catch (err: any) {
    console.error("[/api/es/session-levels] error:", err?.message ?? err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
