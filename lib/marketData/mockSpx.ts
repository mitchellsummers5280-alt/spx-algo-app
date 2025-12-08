// lib/marketData/mockSpx.ts

import { SpiceCandle, Timeframe } from "./types";

function minutesForTimeframe(tf: Timeframe): number {
  switch (tf) {
    case "1m":
      return 1;
    case "3m":
      return 3;
    case "5m":
      return 5;
    case "15m":
      return 15;
    case "30m":
      return 30;
    case "1h":
      return 60;
    case "4h":
      return 240;
    default:
      return 5;
  }
}

/**
 * Generate a fake SPX price path for UI + algo testing.
 * Starts near 5000 and wanders up/down with small random candles.
 */
export function generateMockSpxCandles(options: {
  timeframe: Timeframe;
  bars: number;
}): SpiceCandle[] {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const stepMinutes = minutesForTimeframe(options.timeframe);
  const stepSeconds = stepMinutes * 60;

  let price = 5000; // starting mock SPX level
  const candles: SpiceCandle[] = [];

  for (let i = options.bars - 1; i >= 0; i--) {
    const time = nowSeconds - i * stepSeconds;

    // Random walk with tiny drift and volatility
    const drift = (Math.random() - 0.5) * 4; // ±4 points
    const vol = (Math.random() - 0.5) * 6;   // ±6 points
    const open = price;
    const close = price + drift + vol;
    const high = Math.max(open, close) + Math.random() * 3;
    const low = Math.min(open, close) - Math.random() * 3;

    price = close;

    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume: Math.floor(1000 + Math.random() * 5000),
    });
  }

  return candles;
}
