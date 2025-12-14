// lib/hooks/useSpiceEngine.ts
"use client";

import { useEffect, useState } from "react";
import { runAggregator } from "@/lib/aggregator/spiceAggregator";
import { useSpiceStore } from "@/lib/store/spiceStore";
import { useEngineStore } from "@/lib/store/engineStore";
import type {
  AggregatorContext,
  EngineSource,
} from "@/lib/aggregator/aggregatorTypes";
import {
  formatEtTime,
  getEtMinutesNow,
  inSessionWindow,
} from "@/lib/utils/marketTime";

export function useSpiceEngine() {
  const [etTime, setEtTime] = useState("");
  const [isNYSession, setIsNYSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const source: EngineSource = "timer";

    const tick = () => {
      if (cancelled) return;

      try {
        const s = useSpiceStore.getState();

        // 1) Session awareness (ET) — compute first so ctx can include it
        const nextEtTime = formatEtTime();
        const etMinutes = getEtMinutesNow();
        const nextIsNYSession = inSessionWindow(etMinutes);

        setEtTime(nextEtTime);
        setIsNYSession(nextIsNYSession);

        // 2) Build ctx (now includes isNYSession)
        const ctx: AggregatorContext = {
          price: s.price ?? null,
          hasOpenTrade: !!s.hasOpenTrade,
          session: s.session ?? null,

          // ✅ Step 4.1: pass NY window into engines
          isNYSession: nextIsNYSession,

          twentyEmaAboveTwoHundred: s.twentyEmaAboveTwoHundred,
          atAllTimeHigh: s.atAllTimeHigh,

          sweptAsiaHigh: s.sweptAsiaHigh,
          sweptAsiaLow: s.sweptAsiaLow,
          sweptLondonHigh: s.sweptLondonHigh,
          sweptLondonLow: s.sweptLondonLow,
          sweptNYHigh: s.sweptNYHigh,
          sweptNYLow: s.sweptNYLow,

          newsImpactOn: (s as any).newsImpactOn ?? false,
        } as any;

        // 3) Run engines
        const snapshot = runAggregator(ctx, source);

        // ✅ Debug UI reads from engineStore snapshot
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

  // Return flags for the UI (e.g., /spx/debug)
  return {
    etTime,
    isNYSession,
  };
}
