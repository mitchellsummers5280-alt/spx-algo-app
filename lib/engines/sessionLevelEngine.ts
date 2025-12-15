// lib/engines/sessionLevelEngine.ts

import type { Candle } from "@/lib/store/candleStore";
import { SESSION_TIMES } from "./sessionTimes";
import type { SessionId, SessionLevels } from "./sessionTypes";

type SessionState = Record<SessionId, SessionLevels>;

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Always compute time in America/New_York so this works regardless of machine TZ.
 */
function getEtMinutes(ms: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));

  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hh * 60 + mm;
}

function isInSession(candleTime: number, start: string, end: string): boolean {
  const now = getEtMinutes(candleTime);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);

  // Overnight session (e.g., Asia) where end < start
  if (e < s) return now >= s || now <= e;
  return now >= s && now <= e;
}

/**
 * ✅ History reducer:
 * Compute session levels from recent history (last ~36h by default),
 * so Asia/London appear immediately after seeding candles.
 */
export function buildSessionLevels(
  candles1m: Candle[],
  _prev?: SessionState,
  lookbackMs: number = 36 * 60 * 60 * 1000
): SessionState {
  const nowMs = Date.now();
  const cutoff = nowMs - lookbackMs;

  const state: SessionState = {
    asia: { high: null, low: null, complete: false },
    london: { high: null, low: null, complete: false },
    ny: { high: null, low: null, complete: false },
  };

  const recent = Array.isArray(candles1m)
    ? candles1m.filter((c) => typeof c?.t === "number" && c.t >= cutoff)
    : [];

  for (const c of recent) {
    // ASIA
    if (isInSession(c.t, SESSION_TIMES.ASIA.start, SESSION_TIMES.ASIA.end)) {
      state.asia.high = state.asia.high === null ? c.h : Math.max(state.asia.high, c.h);
      state.asia.low = state.asia.low === null ? c.l : Math.min(state.asia.low, c.l);
    }

    // LONDON
    if (isInSession(c.t, SESSION_TIMES.LONDON.start, SESSION_TIMES.LONDON.end)) {
      state.london.high =
        state.london.high === null ? c.h : Math.max(state.london.high, c.h);
      state.london.low =
        state.london.low === null ? c.l : Math.min(state.london.low, c.l);
    }

    // NY
    if (isInSession(c.t, SESSION_TIMES.NY.start, SESSION_TIMES.NY.end)) {
      state.ny.high = state.ny.high === null ? c.h : Math.max(state.ny.high, c.h);
      state.ny.low = state.ny.low === null ? c.l : Math.min(state.ny.low, c.l);
    }
  }

  // Mark complete if we found any values in the lookback window
  state.asia.complete = state.asia.high !== null && state.asia.low !== null;
  state.london.complete = state.london.high !== null && state.london.low !== null;
  state.ny.complete = state.ny.high !== null && state.ny.low !== null;

  return state;
}
