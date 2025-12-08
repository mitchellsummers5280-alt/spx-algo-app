// lib/hooks/useExitEngine.ts
"use client";

import { useEffect, useState } from "react";
import {
  computeExitRecommendation,
  type ExitContext,
  type ExitRecommendation,
} from "@/lib/engines/exitEngine";

export interface LiveExitInput {
  entryPrice: number;
  currentPrice: number;
  isLong: boolean;
  stopLoss?: number;
  target?: number;
  scaleOutLevel?: number;
  maxHoldMinutes?: number;
  openedAt: number; // timestamp ms
  label?: string;
}

const NO_TRADE_RECOMMENDATION: ExitRecommendation = {
  status: "no-trade",
  message: "No active trade. Enter a live trade to get exit guidance.",
  confidence: 0,
};

export function useExitEngine(trade: LiveExitInput | null) {
  const [recommendation, setRecommendation] =
    useState<ExitRecommendation>(NO_TRADE_RECOMMENDATION);

  useEffect(() => {
    if (!trade) {
      setRecommendation(NO_TRADE_RECOMMENDATION);
      return;
    }

    const runOnce = () => {
      const ctx: ExitContext = {
        entryPrice: trade.entryPrice,
        currentPrice: trade.currentPrice,
        isLong: trade.isLong,
        stopLoss: trade.stopLoss,
        target: trade.target,
        scaleOutLevel: trade.scaleOutLevel,
        maxHoldMinutes: trade.maxHoldMinutes,
        openedAt: trade.openedAt,
        now: Date.now(),
        label: trade.label,
      };

      const result = computeExitRecommendation(ctx);
      setRecommendation(result);
    };

    runOnce();
    const id = setInterval(runOnce, 1000);
    return () => clearInterval(id);
  }, [trade]);

  return recommendation;
}
