// lib/engines/multiTimeframeEngine.ts

import { useCandleStore, Candle, TimeframeId } from "@/lib/store/candleStore";
import { computeSweepFlags } from "@/lib/engines/sweepDetector";

export interface MultiTimeframeState {
  primaryTimeframe: TimeframeId;
  twentyEma: number | null;
  twoHundredEma: number | null;
  twentyEmaAboveTwoHundred: boolean;
  atAllTimeHigh: boolean;
  sweptAsiaHigh: boolean;
  sweptAsiaLow: boolean;
  sweptLondonHigh: boolean;
  sweptLondonLow: boolean;
  sweptNYHigh: boolean;
  sweptNYLow: boolean;
}

function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let result = values[0];
  for (let i = 1; i < values.length; i++) {
    result = values[i] * k + result * (1 - k);
  }
  return result;
}

function computeAtAllTimeHigh(candles: Candle[]): boolean {
  if (candles.length === 0) return false;
  const highs = candles.map((c) => c.h);
  const maxHigh = Math.max(...highs);
  const last = candles[candles.length - 1];
  return last.c >= maxHigh * 0.999;
}

/**
 * Compute session high/low for today between [startHour, endHour)
 * Hours are in local time (server TZ); we're approximating sessions here.
 */
function sessionRangeForToday(
  candles: Candle[],
  now: Date,
  startHour: number,
  endHour: number
): { high: number | null; low: number | null } {
  if (!candles.length) return { high: null, low: null };

  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  const start = new Date(year, month, date, startHour, 0, 0, 0).getTime();
  const end = new Date(year, month, date, endHour, 0, 0, 0).getTime();

  let hi: number | null = null;
  let lo: number | null = null;

  for (const c of candles) {
    if (c.t >= start && c.t < end) {
      hi = hi === null ? c.h : Math.max(hi, c.h);
      lo = lo === null ? c.l : Math.min(lo, c.l);
    }
  }

  return { high: hi, low: lo };
}

export function computeMultiTimeframeState(
  nowMs: number = Date.now()
): MultiTimeframeState {
  const candleState = useCandleStore.getState();

  // Primary TF for EMAs
  const primaryTf: TimeframeId = "5m";
  const primaryCandles = candleState.getCandles(primaryTf);

  const closes = primaryCandles.map((c) => c.c);
  const twenty = ema(closes, 20);
  const twoHundred = ema(closes, 200);

  const twentyAboveTwoHundred =
    twenty != null && twoHundred != null ? twenty > twoHundred : false;

  const atAth = computeAtAllTimeHigh(primaryCandles);

  // 1m candles for sweep detection + session ranges
  const oneMinCandles = candleState.getCandles("1m");
  const now = new Date(nowMs);

  // Session ranges (hours are rough approximations, adjust later if you want)
  const asiaRange = sessionRangeForToday(oneMinCandles, now, 20, 24); // 8pm–12am ET
  const londonRange = sessionRangeForToday(oneMinCandles, now, 2, 5);  // 2am–5am ET
  const nyRange = sessionRangeForToday(oneMinCandles, now, 9, 16);     // 9am–4pm ET

  // Candle-based sweep detection (ICT style)
  const sweepFlags = computeSweepFlags(
    {
      asiaHigh: asiaRange.high,
      asiaLow: asiaRange.low,
      londonHigh: londonRange.high,
      londonLow: londonRange.low,
      nyHigh: nyRange.high,
      nyLow: nyRange.low,
    },
    oneMinCandles
  );

  return {
    primaryTimeframe: primaryTf,
    twentyEma: twenty,
    twoHundredEma: twoHundred,
    twentyEmaAboveTwoHundred: twentyAboveTwoHundred,
    atAllTimeHigh: atAth,
    sweptAsiaHigh: sweepFlags.sweptAsiaHigh,
    sweptAsiaLow: sweepFlags.sweptAsiaLow,
    sweptLondonHigh: sweepFlags.sweptLondonHigh,
    sweptLondonLow: sweepFlags.sweptLondonLow,
    sweptNYHigh: sweepFlags.sweptNYHigh,
    sweptNYLow: sweepFlags.sweptNYLow,
  };
}
