// lib/engines/sessionLevelEngine.ts
// Computes rolling session highs/lows from 1m candles (seeded history + live updates).
// Goal: During NY trading, Asia/London should already be populated from earlier candles.

export type SessionId = "asia" | "london" | "ny";

export type SessionHL = {
  high: number | null;
  low: number | null;
};

export type SessionLevels = {
  asia: SessionHL;
  london: SessionHL;
  ny: SessionHL;
};

type CandleLike = {
  t: number; // ms since epoch
  h: number;
  l: number;
};

// ET session windows in minutes since midnight (America/New_York).
// Note: Asia crosses midnight.
const SESSION_WINDOWS: Record<
  SessionId,
  { startMin: number; endMin: number; crossesMidnight: boolean }
> = {
  // 8:00 PM -> 2:00 AM ET (common futures “Asia” window)
  asia: { startMin: 20 * 60, endMin: 2 * 60, crossesMidnight: true },

  // 2:00 AM -> 9:30 AM ET
  london: { startMin: 2 * 60, endMin: 9 * 60 + 30, crossesMidnight: false },

  // 9:30 AM -> 11:30 AM ET (your “trade window”)
  ny: { startMin: 9 * 60 + 30, endMin: 11 * 60 + 30, crossesMidnight: false },
};

const TZ = "America/New_York";

function etParts(ms: number) {
  const d = new Date(ms);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = fmt.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";

  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");
  const hh = parseInt(get("hour"), 10);
  const mi = parseInt(get("minute"), 10);

  return {
    ymd: `${yyyy}-${mm}-${dd}`,
    minutes: hh * 60 + mi,
  };
}

function ymdMinus1(ymd: string) {
  // ymd in ET; subtract one day safely using Date in UTC by parsing components
  const [Y, M, D] = ymd.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(Y, (M ?? 1) - 1, D ?? 1));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function candleSessionKey(c: CandleLike, session: SessionId) {
  const w = SESSION_WINDOWS[session];
  const { ymd, minutes } = etParts(c.t);

  if (!w.crossesMidnight) {
    // normal window: same-day membership
    if (minutes >= w.startMin && minutes < w.endMin) return `${session}:${ymd}`;
    return null;
  }

  // crosses midnight (Asia):
  // membership if minutes >= start OR minutes < end
  const inWindow = minutes >= w.startMin || minutes < w.endMin;
  if (!inWindow) return null;

  // anchor date should be the START date of the session.
  // If we're after midnight (minutes < endMin), anchor to previous day.
  const anchor = minutes < w.endMin ? ymdMinus1(ymd) : ymd;
  return `${session}:${anchor}`;
}

function pickTargetKey(nowMs: number, session: SessionId) {
  // We want:
  // - Asia/London: most recent COMPLETED session during NY (so levels already exist)
  // - NY: current in-progress if inside window, else most recent completed
  const { ymd, minutes } = etParts(nowMs);
  const w = SESSION_WINDOWS[session];

  if (session === "ny") {
    // If currently inside NY window, target today
    if (minutes >= w.startMin && minutes < w.endMin) return `ny:${ymd}`;
    // otherwise last completed NY is yesterday (because today’s hasn’t happened yet or already finished)
    return `ny:${ymdMinus1(ymd)}`;
  }

  if (session === "london") {
    // If we are AFTER London end (>= 9:30), target today’s London (completed)
    if (minutes >= w.endMin) return `london:${ymd}`;
    // If we are before London end, target yesterday’s London (most recent completed)
    return `london:${ymdMinus1(ymd)}`;
  }

  // Asia crosses midnight
  // If we are AFTER Asia end (>= 2:00) and before next Asia start (20:00),
  // then the most recent completed Asia is anchored to yesterday.
  // If we are inside Asia window (>=20:00 or <2:00), target the current in-progress Asia (anchored appropriately).
  if (minutes >= w.startMin || minutes < w.endMin) {
    // in-progress Asia
    const anchor = minutes < w.endMin ? ymdMinus1(ymd) : ymd;
    return `asia:${anchor}`;
  }

  // not in Asia window => last completed Asia anchored to yesterday
  return `asia:${ymdMinus1(ymd)}`;
}

function computeHL(candles: CandleLike[], key: string): SessionHL {
  let hi: number | null = null;
  let lo: number | null = null;

  for (const c of candles) {
    // require basic sanity
    if (!Number.isFinite(c.t) || !Number.isFinite(c.h) || !Number.isFinite(c.l)) continue;

    const kAsia = key.startsWith("asia:") ? candleSessionKey(c, "asia") : null;
    const kLon = key.startsWith("london:") ? candleSessionKey(c, "london") : null;
    const kNy = key.startsWith("ny:") ? candleSessionKey(c, "ny") : null;

    const k = kAsia ?? kLon ?? kNy;
    if (k !== key) continue;

    hi = hi == null ? c.h : Math.max(hi, c.h);
    lo = lo == null ? c.l : Math.min(lo, c.l);
  }

  return { high: hi, low: lo };
}

/**
 * buildSessionLevels(oneMinCandles, prev?)
 * - oneMinCandles: 1m candles (seeded + live)
 * - prev: optional previous levels (ignored here but allowed for compatibility)
 */
export function buildSessionLevels(
  oneMinCandles: CandleLike[],
  _prev?: any
): SessionLevels {
  const now = Date.now();

  const asiaKey = pickTargetKey(now, "asia");
  const londonKey = pickTargetKey(now, "london");
  const nyKey = pickTargetKey(now, "ny");

  const asia = computeHL(oneMinCandles, asiaKey);
  const london = computeHL(oneMinCandles, londonKey);
  const ny = computeHL(oneMinCandles, nyKey);

  return { asia, london, ny };
}
