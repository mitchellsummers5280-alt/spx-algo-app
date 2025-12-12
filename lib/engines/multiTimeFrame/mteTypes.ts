// lib/engines/multiTimeframe/mteTypes.ts

export type Timeframe =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "4h";

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TFAnalysis {
  ema20: number;
  ema200: number;
  emaTrend: "bull" | "bear" | "neutral";
  structure: "bos-up" | "bos-down" | "choch-up" | "choch-down" | "none";
  liquiditySweep: boolean;
  biasScore: number; // -1 to +1
}

export interface MultiTimeframeResult {
  perTF: Record<Timeframe, TFAnalysis>;
  combinedBias: number; // -1 to +1
  signal: "long" | "short" | "neutral";
  confidence: number; // 0–100
}
