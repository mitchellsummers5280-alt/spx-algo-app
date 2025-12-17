// lib/providers/esFutures.ts
// Massive Futures Custom Bars (aggs) — normalize timestamp + OHLC robustly

export type MassiveBar = {
  t: number; // ms
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

const BASE = "https://api.massive.com";

function key(): string {
  const k = process.env.MASSIVE_API_KEY;
  if (!k) throw new Error("Missing MASSIVE_API_KEY in .env.local");
  return k;
}

function msToNs(ms: number) {
  if (!Number.isFinite(ms)) throw new Error(`Bad ms: ${ms}`);
  return Math.trunc(ms * 1_000_000);
}

function toNum(x: any): number | null {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : null;
}

// Massive often returns window_start (ns). Some payloads use t/ts/time.
function pickTimeNs(r: any): number | null {
  return (
    toNum(r?.window_start) ??
    toNum(r?.t) ??
    toNum(r?.ts) ??
    toNum(r?.time) ??
    toNum(r?.start) ??
    null
  );
}

// OHLC keys are usually o/h/l/c but we support alternates.
function pickOhlc(r: any) {
  const o = toNum(r?.o ?? r?.open);
  const h = toNum(r?.h ?? r?.high);
  const l = toNum(r?.l ?? r?.low);
  const c = toNum(r?.c ?? r?.close);
  const v = toNum(r?.v ?? r?.volume) ?? undefined;
  return { o, h, l, c, v };
}

/**
 * Fetch futures OHLC from Massive for a specific contract ticker (ex: ESH6).
 * Uses /futures/vX/aggs/{ticker}?resolution=1min&window_start.gte=...&window_start.lt=...
 */
export async function fetchFuturesAggs(params: {
  ticker: string; // e.g. "ESH6"
  fromMs: number; // epoch ms
  toMs: number;   // epoch ms
  resolution?: string; // default "1min"
  limit?: number;      // default 50000
}): Promise<MassiveBar[]> {
  const {
    ticker,
    fromMs,
    toMs,
    resolution = "1min",
    limit = 50000,
  } = params;

  const qs = new URLSearchParams({
    resolution,
    "window_start.gte": String(msToNs(fromMs)),
    "window_start.lt": String(msToNs(toMs)),
    limit: String(limit),
    apiKey: key(),
  });

  const url = `${BASE}/futures/vX/aggs/${encodeURIComponent(ticker)}?${qs.toString()}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Massive futures aggs failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const results: any[] = Array.isArray(data?.results) ? data.results : [];

  const out: MassiveBar[] = [];

  for (const r of results) {
    const tNs = pickTimeNs(r);
    const { o, h, l, c, v } = pickOhlc(r);

    if (tNs == null || o == null || h == null || l == null || c == null) continue;

    // Massive uses ns timestamps → ms
    const t = Math.trunc(tNs / 1_000_000);
    out.push({ t, o, h, l, c, v });
  }

  out.sort((a, b) => a.t - b.t);

  return out;
}
