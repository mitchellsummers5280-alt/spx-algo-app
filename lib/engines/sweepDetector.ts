// lib/engines/sweepDetector.ts

import type { Candle } from "@/lib/store/candleStore";

export interface SessionLevels {
  asiaHigh?: number | null;
  asiaLow?: number | null;
  londonHigh?: number | null;
  londonLow?: number | null;
  nyHigh?: number | null;
  nyLow?: number | null;
}

export interface SweepFlags {
  sweptAsiaHigh: boolean;
  sweptAsiaLow: boolean;
  sweptLondonHigh: boolean;
  sweptLondonLow: boolean;
  sweptNYHigh: boolean;
  sweptNYLow: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Session windows (ET)                                                      */
/* -------------------------------------------------------------------------- */
/**
 * You can tweak these later. These are “good enough” defaults:
 * - Asia: 20:00–02:00 (spans midnight)
 * - London: 02:00–05:00
 * - NY: 09:30–11:30 (your current marketTime window)
 */
const TZ_ET = "America/New_York";

const ASIA_START_MIN = 20 * 60; // 20:00
const ASIA_END_MIN = 2 * 60; // 02:00 (next day)

const LONDON_START_MIN = 2 * 60; // 02:00
const LONDON_END_MIN = 5 * 60; // 05:00

const NY_START_MIN = 9 * 60 + 30; // 09:30
const NY_END_MIN = 11 * 60 + 30; // 11:30

type EtParts = {
  y: number;
  m: number;
  d: number;
  minutes: number; // minutes since midnight ET
};

function getEtParts(ms: number): EtParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_ET,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const y = parseInt(get("year") ?? "0", 10);
  const m = parseInt(get("month") ?? "0", 10);
  const d = parseInt(get("day") ?? "0", 10);
  const hh = parseInt(get("hour") ?? "0", 10);
  const mm = parseInt(get("minute") ?? "0", 10);

  return { y, m, d, minutes: hh * 60 + mm };
}

function etDateKey(p: Pick<EtParts, "y" | "m" | "d">) {
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

function isSameEtDay(ms: number, dayKey: string) {
  const p = getEtParts(ms);
  return etDateKey(p) === dayKey;
}

/**
 * For “today”, we compute:
 * - London + NY from today’s ET date
 * - Asia from “prior evening” (20:00–24:00 previous ET date) PLUS (00:00–02:00 today ET date)
 */
function computeDayKeyFromCandles(oneMinCandles: Candle[]) {
  // Use the most recent candle as "today" anchor
  const last = oneMinCandles[oneMinCandles.length - 1];
  const p = getEtParts(last?.t ?? Date.now());
  return etDateKey(p);
}

function computePrevDayKey(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // noon UTC avoids DST edge cases
  dt.setUTCDate(dt.getUTCDate() - 1);

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ_ET,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(dt);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const yy = parseInt(get("year") ?? "0", 10);
  const mm = parseInt(get("month") ?? "0", 10);
  const dd = parseInt(get("day") ?? "0", 10);

  return etDateKey({ y: yy, m: mm, d: dd });
}

function updateHiLo(
  acc: { hi: number | null; lo: number | null },
  c: Candle
) {
  acc.hi = acc.hi == null ? c.h : Math.max(acc.hi, c.h);
  acc.lo = acc.lo == null ? c.l : Math.min(acc.lo, c.l);
}

/**
 * Compute session levels from 1m candles.
 * Returns nulls when there aren’t candles in that session window yet.
 */
export function computeSessionLevels(oneMinCandles: Candle[] | undefined): SessionLevels {
  const candles = oneMinCandles ?? [];
  if (candles.length === 0) {
    return {
      asiaHigh: null,
      asiaLow: null,
      londonHigh: null,
      londonLow: null,
      nyHigh: null,
      nyLow: null,
    };
  }

  const todayKey = computeDayKeyFromCandles(candles);
  const prevKey = computePrevDayKey(todayKey);

  const asia = { hi: null as number | null, lo: null as number | null };
  const london = { hi: null as number | null, lo: null as number | null };
  const ny = { hi: null as number | null, lo: null as number | null };

  for (const c of candles) {
    const p = getEtParts(c.t);
    const key = etDateKey(p);

    // London (today 02:00–05:00)
    if (key === todayKey && p.minutes >= LONDON_START_MIN && p.minutes < LONDON_END_MIN) {
      updateHiLo(london, c);
    }

    // NY (today 09:30–11:30)
    if (key === todayKey && p.minutes >= NY_START_MIN && p.minutes < NY_END_MIN) {
      updateHiLo(ny, c);
    }

    // Asia spans midnight:
    // - previous day 20:00–24:00
    if (key === prevKey && p.minutes >= ASIA_START_MIN) {
      updateHiLo(asia, c);
    }
    // - today 00:00–02:00
    if (key === todayKey && p.minutes >= 0 && p.minutes < ASIA_END_MIN) {
      updateHiLo(asia, c);
    }
  }

  return {
    asiaHigh: asia.hi,
    asiaLow: asia.lo,
    londonHigh: london.hi,
    londonLow: london.lo,
    nyHigh: ny.hi,
    nyLow: ny.lo,
  };
}

/* -------------------------------------------------------------------------- */
/*  Sweep detection (your existing logic)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Detect a sweep of a HIGH using 2-candle structure:
 *  - Candle A trades through the level (wick > level, body starts below)
 *  - Candle B closes back below the level
 */
function detectHighSweep(level: number | null | undefined, candles: Candle[]): boolean {
  if (!level || !candles.length) return false;
  if (candles.length < 2) return false;

  const window = candles.slice(-50); // last ~50 1m candles

  for (let i = 0; i < window.length - 1; i++) {
    const a = window[i];
    const b = window[i + 1];

    const tradedAbove = a.h > level && a.o < level;
    const closedBackBelow = b.c < level;

    if (tradedAbove && closedBackBelow) return true;
  }

  return false;
}

/**
 * Detect a sweep of a LOW using 2-candle structure:
 *  - Candle A trades through the level (wick < level, body starts above)
 *  - Candle B closes back above the level
 */
function detectLowSweep(level: number | null | undefined, candles: Candle[]): boolean {
  if (!level || !candles.length) return false;
  if (candles.length < 2) return false;

  const window = candles.slice(-50);

  for (let i = 0; i < window.length - 1; i++) {
    const a = window[i];
    const b = window[i + 1];

    const tradedBelow = a.l < level && a.o > level;
    const closedBackAbove = b.c > level;

    if (tradedBelow && closedBackAbove) return true;
  }

  return false;
}

/**
 * Given session highs/lows + a stream of 1m candles,
 * compute which session levels have been swept.
 */
export function computeSweepFlags(
  levels: SessionLevels,
  oneMinCandles: Candle[] | undefined
): SweepFlags {
  const candles = oneMinCandles ?? [];

  return {
    sweptAsiaHigh: detectHighSweep(levels.asiaHigh ?? null, candles),
    sweptAsiaLow: detectLowSweep(levels.asiaLow ?? null, candles),
    sweptLondonHigh: detectHighSweep(levels.londonHigh ?? null, candles),
    sweptLondonLow: detectLowSweep(levels.londonLow ?? null, candles),
    sweptNYHigh: detectHighSweep(levels.nyHigh ?? null, candles),
    sweptNYLow: detectLowSweep(levels.nyLow ?? null, candles),
  };
}
