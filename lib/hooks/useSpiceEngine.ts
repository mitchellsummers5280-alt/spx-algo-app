// lib/hooks/useSpiceEngine.ts
"use client";

import { useEffect } from "react";
import { runAggregator } from "lib/aggregator/spiceAggregator";
import type { AggregatorContext } from "lib/aggregator/aggregatorTypes";
import { useEngineStore } from "lib/store/engineStore";
import { useSpiceStore } from "lib/store/spiceStore";
import { computeMultiTimeframeState } from "lib/engines/multiTimeFrame/multiTimeframeEngine";
import { usePolygonLive } from "./usePolygonLive";

/**
 * Build the AggregatorContext directly from the Zustand store.
 */
function buildContextFromStore(): AggregatorContext {
  const s = useSpiceStore.getState();

  return {
    price: s.price,
    hasOpenTrade: s.hasOpenTrade,
    session: s.session,

    // MTE-related fields
    primaryTimeframe: s.primaryTimeframe,
    twentyEma: s.twentyEma,
    twoHundredEma: s.twoHundredEma,
    twentyEmaAboveTwoHundred: s.twentyEmaAboveTwoHundred,
    atAllTimeHigh: s.atAllTimeHigh,
    sweptAsiaHigh: s.sweptAsiaHigh,
    sweptAsiaLow: s.sweptAsiaLow,
    sweptLondonHigh: s.sweptLondonHigh,
    sweptLondonLow: s.sweptLondonLow,
  };
}

export function useSpiceEngine() {
  usePolygonLive();
  const setEngineSnapshot = useEngineStore((s) => s.setSnapshot);

  useEffect(() => {
    const intervalId = setInterval(() => {
      // 1) Compute multi-timeframe state from candles
      const mteState = computeMultiTimeframeState();

      // 2) Push it into the main SPICE store so UI + aggregator can see it
      useSpiceStore.setState({
        primaryTimeframe: mteState.primaryTimeframe,
        twentyEma: mteState.twentyEma,
        twoHundredEma: mteState.twoHundredEma,
        twentyEmaAboveTwoHundred: mteState.twentyEmaAboveTwoHundred,
        atAllTimeHigh: mteState.atAllTimeHigh,
        sweptAsiaHigh: mteState.sweptAsiaHigh,
        sweptAsiaLow: mteState.sweptAsiaLow,
        sweptLondonHigh: mteState.sweptLondonHigh,
        sweptLondonLow: mteState.sweptLondonLow,
      });

      // 3) Rebuild context from the updated store
      const ctx: AggregatorContext = buildContextFromStore();

      // 4) Run the aggregator (bias, entries, exits, notes, etc.)
      const snapshot = runAggregator(ctx);

      // 5) Save the latest engine snapshot (for engine debug UI later)
      setEngineSnapshot(snapshot);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [setEngineSnapshot]);
}
