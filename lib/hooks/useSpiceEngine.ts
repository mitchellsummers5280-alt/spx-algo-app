// lib/hooks/useSpiceEngine.ts
"use client";

import { useEffect } from "react";
import { runAggregator } from "@/lib/aggregator/spiceAggregator";
import { useSpiceStore } from "@/lib/store/spiceStore";
import { useEngineStore } from "@/lib/store/engineStore";
import type { AggregatorContext, EngineSource } from "@/lib/aggregator/aggregatorTypes";

export function useSpiceEngine() {
  useEffect(() => {
    let cancelled = false;
    const source: EngineSource = "timer";

    const tick = () => {
      if (cancelled) return;

      try {
        const s = useSpiceStore.getState();

        const ctx: AggregatorContext = {
          price: s.price ?? null,
          hasOpenTrade: !!s.hasOpenTrade,
          session: s.session ?? null,

          twentyEmaAboveTwoHundred: s.twentyEmaAboveTwoHundred,
          atAllTimeHigh: s.atAllTimeHigh,

          sweptAsiaHigh: s.sweptAsiaHigh,
          sweptAsiaLow: s.sweptAsiaLow,
          sweptLondonHigh: s.sweptLondonHigh,
          sweptLondonLow: s.sweptLondonLow,

          newsImpactOn: (s as any).newsImpactOn ?? false,
        } as any;

        const snapshot = runAggregator(ctx, source);

        // ✅ this is what your debug UI should ultimately read from
        useEngineStore.getState().setSnapshot(snapshot);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("[SPICE] useSpiceEngine tick error:", err);
        }
      }
    };

    tick();
    const id = setInterval(tick, 1000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
}
