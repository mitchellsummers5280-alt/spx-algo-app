// lib/engines/exitEngine.ts

export type ExitStatus =
  | "no-trade"
  | "hold"
  | "take-profit"
  | "cut-loss"
  | "scale-out"
  | "time-exit";

export interface ExitContext {
  entryPrice: number;        // option premium / futures price
  currentPrice: number;      // live premium/price
  isLong: boolean;           // long calls/long position vs short/puts

  stopLoss?: number;
  target?: number;
  scaleOutLevel?: number;

  openedAt: number;          // timestamp ms
  now: number;               // timestamp ms
  maxHoldMinutes?: number;

  label?: string;
}

export interface ExitRecommendation {
  status: ExitStatus;
  message: string;
  suggestedExitPrice?: number;
  riskRMultiple?: number;
  confidence: number; // 0–1
}

// Compute R multiple if we know stop loss
function computeRiskMultiple(ctx: ExitContext): number | undefined {
  if (ctx.stopLoss == null) return undefined;

  const riskPerUnit = ctx.isLong
    ? ctx.entryPrice - ctx.stopLoss
    : ctx.stopLoss - ctx.entryPrice;

  if (riskPerUnit <= 0) return undefined;

  const pnlPerUnit = ctx.isLong
    ? ctx.currentPrice - ctx.entryPrice
    : ctx.entryPrice - ctx.currentPrice;

  return pnlPerUnit / riskPerUnit;
}

export function computeExitRecommendation(
  ctx: ExitContext
): ExitRecommendation {
  if (!Number.isFinite(ctx.entryPrice) || !Number.isFinite(ctx.currentPrice)) {
    return {
      status: "no-trade",
      message: "No valid trade or price data. Waiting for live input.",
      confidence: 0,
    };
  }

  const {
    entryPrice,
    currentPrice,
    isLong,
    stopLoss,
    target,
    scaleOutLevel,
    maxHoldMinutes,
    openedAt,
    now,
  } = ctx;

  const riskRMultiple = computeRiskMultiple(ctx);

  // ⏰ Time-based exit
  if (maxHoldMinutes != null && maxHoldMinutes > 0) {
    const minutesOpen = (now - openedAt) / 60000;
    if (minutesOpen >= maxHoldMinutes) {
      return {
        status: "time-exit",
        message: `Trade has been open ~${minutesOpen.toFixed(
          1
        )} minutes (max ${maxHoldMinutes}). Consider closing.`,
        suggestedExitPrice: currentPrice,
        riskRMultiple,
        confidence: 0.75,
      };
    }
  }

  const isFavorableMove = isLong
    ? currentPrice > entryPrice
    : currentPrice < entryPrice;

  // 🛑 Stop loss
  if (stopLoss != null) {
    const hitStop = isLong
      ? currentPrice <= stopLoss
      : currentPrice >= stopLoss;

    if (hitStop) {
      return {
        status: "cut-loss",
        message: `Stop loss ${stopLoss.toFixed(
          2
        )} reached. Recommendation: exit to protect capital.`,
        suggestedExitPrice: currentPrice,
        riskRMultiple,
        confidence: 0.95,
      };
    }
  }

  // 🎯 Full target
  if (target != null) {
    const hitTarget = isLong
      ? currentPrice >= target
      : currentPrice <= target;

    if (hitTarget) {
      return {
        status: "take-profit",
        message: `Target ${target.toFixed(
          2
        )} reached. Recommendation: secure full profits.`,
        suggestedExitPrice: currentPrice,
        riskRMultiple,
        confidence: 0.9,
      };
    }
  }

  // 📉 Scale-out
  if (scaleOutLevel != null) {
    const hitScaleOut = isLong
      ? currentPrice >= scaleOutLevel
      : currentPrice <= scaleOutLevel;

    if (hitScaleOut && isFavorableMove) {
      return {
        status: "scale-out",
        message: `Price reached scale-out level ${scaleOutLevel.toFixed(
          2
        )}. Consider taking partial profits and letting a runner ride.`,
        suggestedExitPrice: currentPrice,
        riskRMultiple,
        confidence: 0.8,
      };
    }
  }

  // Default: hold
  const directionText = isLong ? "long" : "short";
  const moveText = isFavorableMove ? "in your favor" : "against you";

  return {
    status: "hold",
    message: `Holding ${directionText} – price is ${moveText}. No strong exit signal yet.`,
    suggestedExitPrice: undefined,
    riskRMultiple,
    confidence: 0.6,
  };
}

/**
 * ✅ Compatibility layer for the older aggregator API
 * spiceAggregator.ts imports { evaluateExit, type ExitDecision } from here.
 * We just alias that to the new recommendation-based engine.
 */
export type ExitDecision = ExitRecommendation;

export function evaluateExit(ctx: ExitContext): ExitDecision {
  return computeExitRecommendation(ctx);
}
