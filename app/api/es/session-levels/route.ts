import { NextResponse } from "next/server";
import { fetchFuturesAggs } from "@/lib/providers/esFutures";

const CACHE_TTL_MS = 60_000;

type CacheEntry = { ts: number; body: any };
const g = globalThis as any;
g.__ES_SESSION_CACHE__ ??= new Map<string, CacheEntry>();
const cache: Map<string, CacheEntry> = g.__ES_SESSION_CACHE__;

// ---------- helpers ----------

function addDays(day: string, delta: number) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // midday avoids DST edge weirdness
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// Convert NY "wall time" (America/New_York) to UTC ms for a given YYYY-MM-DD + hh:mm
function nyWallTimeToUtcMs(day: string, hh: number, mm: number) {
  const [y, m, d] = day.split("-").map(Number);
  const desiredAsUtc = Date.UTC(y, m - 1, d, hh, mm, 0);

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const partsToUtc = (utcMs: number) => {
    const parts = dtf.formatToParts(new Date(utcMs));
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value);

    const yy = get("year");
    const mo = get("month");
    const da = get("day");
    const ho = get("hour");
    const mi = get("minute");
    const se = get("second");

    // Treat the NY wall components as if they were UTC to compare apples-to-apples
    return Date.UTC(yy, mo - 1, da, ho, mi, se);
  };

  // Start with a UTC guess (same components), then iteratively correct
  let utcMs = desiredAsUtc;

  for (let i = 0; i < 3; i++) {
    const wallAsUtc = partsToUtc(utcMs);
    const delta = desiredAsUtc - wallAsUtc;
    utcMs += delta;
    if (delta === 0) break;
  }

  return utcMs;
}

function clampMs(ms: number) {
  if (!Number.isFinite(ms)) throw new Error(`Bad ms: ${ms}`);
  return ms;
}

function computeHiLo(bars: any[]) {
  let hi = -Infinity;
  let lo = Infinity;

  for (const b of bars) {
    const h =
      typeof b.h === "number" ? b.h : typeof b.high === "number" ? b.high : null;
    const l =
      typeof b.l === "number" ? b.l : typeof b.low === "number" ? b.low : null;

    if (h != null) hi = Math.max(hi, h);
    if (l != null) lo = Math.min(lo, l);
  }

  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return null;
  return { high: hi, low: lo };
}

// ---------- route ----------

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const day = searchParams.get("day");
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return NextResponse.json(
        { error: "Missing/invalid day. Expected YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const nocache = searchParams.get("nocache") === "1";

    // Resolve correct ES contract for this day
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const r = await fetch(
      `${baseUrl}/api/es/resolve-contract?day=${encodeURIComponent(
        day
      )}&product_code=ES`,
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

    if (!resolvedTicker) {
      throw new Error("No ES contract resolved (missing chosen.ticker)");
    }

    const ticker = String(resolvedTicker).toUpperCase();

    const cacheKey = `${ticker}|${day}`;
    if (!nocache) {
      const hit = cache.get(cacheKey);
      if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
        return NextResponse.json(hit.body);
      }
    }

    // ✅ Institutional session windows for a NY "day"
    // Asia: (day-1) 18:00 ET → (day) 02:00 ET
    // London: (day) 02:00 ET → (day) 08:30 ET
    const prev = addDays(day, -1);

    const asiaFromMs = clampMs(nyWallTimeToUtcMs(prev, 18, 0)); // prev day 6pm
    const asiaToMs = clampMs(nyWallTimeToUtcMs(day, 2, 0));     // day 2am

    const londonFromMs = asiaToMs;                              // day 2am
    const londonToMs = clampMs(nyWallTimeToUtcMs(day, 8, 30));  // day 8:30am

    const fromMs = asiaFromMs;
    const toMs = londonToMs;

    console.log("[ES SESSION] fetch", {
      day,
      prev,
      ticker,
      fromMs,
      toMs,
      asiaFromMs,
      asiaToMs,
      londonFromMs,
      londonToMs,
      nocache,
    });

    const debugOnly = searchParams.get("debugOnly") === "1";
    if (debugOnly) {
      return NextResponse.json({
        ok: true,
        day,
        prev,
        ticker,
        windows: {
          asia: {
            fromMs: asiaFromMs,
            toMs: asiaToMs,
            fromNY: new Date(asiaFromMs).toLocaleString("en-US", { timeZone: "America/New_York" }),
            toNY: new Date(asiaToMs).toLocaleString("en-US", { timeZone: "America/New_York" }),
          },
          london: {
            fromMs: londonFromMs,
            toMs: londonToMs,
            fromNY: new Date(londonFromMs).toLocaleString("en-US", { timeZone: "America/New_York" }),
            toNY: new Date(londonToMs).toLocaleString("en-US", { timeZone: "America/New_York" }),
          },
        },
      });
    }

    const barsRaw = await fetchFuturesAggs({
      ticker,
      fromMs,
      toMs,
      resolution: "1min",
      limit: 50000,
    });

    const bars = Array.isArray(barsRaw) ? [...barsRaw] : [];
    bars.sort((a, b) => (a?.t ?? 0) - (b?.t ?? 0));

    const inRange = (t: number, a: number, b: number) => t >= a && t < b;

    const asiaBars = bars.filter((b: any) => inRange(b.t, asiaFromMs, asiaToMs));
    const londonBars = bars.filter((b: any) =>
      inRange(b.t, londonFromMs, londonToMs)
    );

    const asia = computeHiLo(asiaBars);
    const london = computeHiLo(londonBars);

    const body = {
      ok: true,
      day,
      ticker,
      resolvedFrom: resolved?.chosen ?? resolved,
      windows: {
        asia: { fromMs: asiaFromMs, toMs: asiaToMs },
        london: { fromMs: londonFromMs, toMs: londonToMs },
      },
      counts: {
        total: bars.length,
        asia: asiaBars.length,
        london: londonBars.length,
      },
      asia,
      london,
      debugTs: {
        fromMs,
        toMs,
        firstTimeMs: bars?.[0]?.t ?? null,
        lastTimeMs: bars?.[bars.length - 1]?.t ?? null,
      },
    };

    cache.set(cacheKey, { ts: Date.now(), body });
    return NextResponse.json(body);
  } catch (err: any) {
    console.error("[/api/es/session-levels] error:", err?.message ?? err);

    return NextResponse.json(
      {
        ok: false,
        error: String(err?.message ?? err),
        asia: null,
        london: null,
        blockedByProvider: true,
      },
      { status: 500 }
    );
  }
}
