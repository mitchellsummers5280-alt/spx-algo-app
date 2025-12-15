import type { Candle } from "../store/candleStore";

export function confirmEntryCandle(
  direction: "long" | "short",
  candles: Candle[]
): boolean {
  if (candles.length < 2) return false;

  const current = candles[candles.length - 1];
  const prev = candles[candles.length - 2];

  if (direction === "long") {
    return (
      current.c > current.o &&
      current.c > prev.h
    );
  }

  if (direction === "short") {
    return (
      current.c < current.o &&
      current.c < prev.l
    );
  }

  return false;
}
