// lib/engines/multiTimeframe/mteHelpers.ts

import { Candle, TFAnalysis } from "./mteTypes";

// Simple EMA
export function calcEMA(candles: Candle[], length: number): number {
  if (candles.length < length) return NaN;

  const k = 2 / (length + 1);
  let ema = candles[0].close;

  for (let i = 1; i < length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return ema;
}

// Determine simple trend from EMAs
export function determineEMATrend(ema20: number, ema200: number) {
  if (ema20 > ema200) return "bull";
  if (ema20 < ema200) return "bear";
  return "neutral";
}

// Very lightweight BOS / CHoCH detection
export function detectStructure(candles: Candle[]): TFAnalysis["structure"] {
  if (candles.length < 5) return "none";

  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  if (last.high > prev.high) return "bos-up";
  if (last.low < prev.low) return "bos-down";

  return "none";
}

// Simple liquidity sweep detection (wick > body)
export function detectLiquiditySweep(c: Candle): boolean {
  const body = Math.abs(c.close - c.open);
  const wick = c.high - c.low;
  return wick > body * 2;
}
