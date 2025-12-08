// lib/marketData/types.ts

export type Timeframe =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h";

export type RawCandle = {
  t: number; // timestamp (ms since epoch)
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v?: number; // volume, if available
};

export type SpiceCandle = {
  time: number; // seconds since epoch (what lightweight-charts likes)
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};
