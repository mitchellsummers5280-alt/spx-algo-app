// lib/engines/multiTimeframeEngine.ts

import { useCandleStore, Candle, TimeframeId } from "@/lib/store/candleStore";

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

function detectSweep(
  candles: Candle[],
  rangeHigh: number | null,
  rangeLow: number | null
): { sweptHigh: boolean; sweptLow: boolean } {
  if (rangeHigh == null || rangeLow == null || candles.length === 0) {
    return { sweptHigh: false, sweptLow: false };
  }

  const lookback = candles.slice(-50);
  let sweptHigh = false;
  let sweptLow = false;

  for (const c of lookback) {
    if (c.h > rangeHigh && c.c < rangeHigh) sweptHigh = true;
    if (c.l < rangeLow && c.c > rangeLow) sweptLow = true;
  }

  return { sweptHigh, sweptLow };
}

export function computeMultiTimeframeState(nowMs: number = Date.now()): MultiTimeframeState {
  const candleState = useCandleStore.getState();

  const primaryTf: TimeframeId = "5m";
  const primaryCandles = candleState.getCandles(primaryTf);

  const closes = primaryCandles.map((c) => c.c);
  const twenty = ema(closes, 20);
  const twoHundred = ema(closes, 200);

  const twentyAboveTwoHundred =
    twenty != null && twoHundred != null ? twenty > twoHundred : false;

  const atAth = computeAtAllTimeHigh(primaryCandles);

  const oneMinCandles = candleState.getCandles("1m");
  const now = new Date(nowMs);

  const asiaRange = sessionRangeForToday(oneMinCandles, now, 20, 24);
  const londonRange = sessionRangeForToday(oneMinCandles, now, 2, 5);

  const asiaSweeps = detectSweep(oneMinCandles, asiaRange.high, asiaRange.low);
  const londonSweeps = detectSweep(oneMinCandles, londonRange.high, londonRange.low);

  return {
    primaryTimeframe: primaryTf,
    twentyEma: twenty,
    twoHundredEma: twoHundred,
    twentyEmaAboveTwoHundred: twentyAboveTwoHundred,
    atAllTimeHigh: atAth,
    sweptAsiaHigh: asiaSweeps.sweptHigh,
    sweptAsiaLow: asiaSweeps.sweptLow,
    sweptLondonHigh: londonSweeps.sweptHigh,
    sweptLondonLow: londonSweeps.sweptLow,
  };
}
