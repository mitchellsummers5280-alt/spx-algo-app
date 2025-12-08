// lib/hooks/useSpiceEngine.ts
"use client";

import { useEffect } from "react";
import { runAggregator } from "lib/aggregator/spiceAggregator";
import { useEngineStore } from "lib/store/engineStore";
import { useSpiceStore } from "lib/store/spiceStore";
import type { AggregatorContext } from "lib/aggregator/aggregatorTypes";

/**
 * Build the AggregatorContext directly from the Zustand store.
 */
function buildContextFromStore(): AggregatorContext {
  const s = useSpiceStore.getState();

  return {
    price: s.price,
    hasOpenTrade: s.hasOpenTrade,
    session: s.session,
    twentyEmaAboveTwoHundred: s.twentyEmaAboveTwoHundred,
    atAllTimeHigh: s.atAllTimeHigh,
    sweptAsiaHigh: s.sweptAsiaHigh,
    sweptAsiaLow: s.sweptAsiaLow,
    sweptLondonHigh: s.sweptLondonHigh,
    sweptLondonLow: s.sweptLondonLow,
    newsImpactOn: s.newsImpactOn,
  };
}

export function useSpiceEngine() {
  const updateSnapshot = useEngineStore((s) => s.updateSnapshot);

  useEffect(() => {
    const run = () => {
      const ctx = buildContextFromStore();
      const snapshot = runAggregator(ctx, "timer");
      updateSnapshot(snapshot);
    };

    // run once immediately
    run();

    // then every 1 second
    const id = window.setInterval(run, 1000);
    return () => window.clearInterval(id);
  }, [updateSnapshot]);
}
