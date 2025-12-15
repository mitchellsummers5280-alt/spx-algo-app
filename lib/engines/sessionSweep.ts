// lib/engines/sessionSweep.ts

import type { SessionLevels } from "./sessionTypes";

export function detectSweep(price: number, session?: SessionLevels) {
  if (!session || session.high === null || session.low === null) {
    return { sweptHigh: false, sweptLow: false };
  }

  return {
    sweptHigh: price > session.high,
    sweptLow: price < session.low,
  };
}
