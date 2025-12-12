// lib/engines/sweepDetector.ts

import type { Candle } from "lib/store/candleStore";

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
  sweptNyHigh: boolean;
  sweptNyLow: boolean;
}

/**
 * Detect a sweep of a HIGH using 2-candle structure:
 *  - Candle A trades through the level (wick > level, body starts below)
 *  - Candle B closes back below the level
 */
function detectHighSweep(
  level: number | null | undefined,
  candles: Candle[]
): boolean {
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
function detectLowSweep(
  level: number | null | undefined,
  candles: Candle[]
): boolean {
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
    sweptNyHigh: detectHighSweep(levels.nyHigh ?? null, candles),
    sweptNyLow: detectLowSweep(levels.nyLow ?? null, candles),
  };
}
