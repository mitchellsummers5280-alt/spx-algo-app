// lib/tjr/tjrCommentary.ts
import { getTJRComment } from "./tjrEngine";

export function buildTJRSignals(spiceState: any) {
  return {
    liquiditySweep: spiceState.sweptLiquidity,
    bos: spiceState.structureShift,
    premium: spiceState.inPremiumZone,
    discount: spiceState.inDiscountZone,
    chop: spiceState.isChoppy,
    timeOfDay: spiceState.sessionPhase, 
    riskWarning: spiceState.riskTooHigh,
  };
}

export function getTJRCommentary(spiceState: any) {
  const signals = buildTJRSignals(spiceState);
  return getTJRComment(signals);
}
