// lib/hooks/useSpiceEngine.ts
"use client";

import { useEffect, useState } from "react";
import { runAggregator } from "@/lib/aggregator/spiceAggregator";
import { useSpiceStore } from "@/lib/store/spiceStore";
import { useEngineStore } from "@/lib/store/engineStore";
import { useCandleStore } from "@/lib/store/candleStore";

import { buildSessionLevels } from "@/lib/engines/sessionLevelEngine";
import { detectSweep } from "@/lib/engines/sessionSweep";

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

        // 1) Session awareness (ET)
        const nextEtTime = formatEtTime();
        const etMinutes = getEtMinutesNow();
        const nextIsNYSession = inSessionWindow(etMinutes);

        setEtTime(nextEtTime);
        setIsNYSession(nextIsNYSession);

        // 2) Pull 1m candles from candleStore
        const oneMinCandles = useCandleStore.getState().getCandles("1m");

        // 3) Compute session levels from candle history (instant on refresh)
        const levelsState = buildSessionLevels(oneMinCandles);

        // Write levels directly into spiceStore fields used by /spx/debug UI
        useSpiceStore.setState(
          {
            asiaHigh: levelsState.asia.high,
            asiaLow: levelsState.asia.low,
            londonHigh: levelsState.london.high,
            londonLow: levelsState.london.low,
            nyHigh: levelsState.ny.high,
            nyLow: levelsState.ny.low,
          } as any
        );

        // 4) Compute sweep flags from those levels + current price
        const priceNow = s.price ?? null;
        if (typeof priceNow === "number" && !Number.isNaN(priceNow)) {
          const asiaSweep = detectSweep(priceNow, levelsState.asia);
          const londonSweep = detectSweep(priceNow, levelsState.london);
          const nySweep = detectSweep(priceNow, levelsState.ny);

          // Prefer store helper if present
          if (typeof (s as any).setMarketContext === "function") {
            (s as any).setMarketContext({
              sweptAsiaHigh: asiaSweep.sweptHigh,
              sweptAsiaLow: asiaSweep.sweptLow,
              sweptLondonHigh: londonSweep.sweptHigh,
              sweptLondonLow: londonSweep.sweptLow,
              sweptNYHigh: nySweep.sweptHigh,
              sweptNYLow: nySweep.sweptLow,
            } as any);
          } else {
            useSpiceStore.setState({
              sweptAsiaHigh: asiaSweep.sweptHigh,
              sweptAsiaLow: asiaSweep.sweptLow,
              sweptLondonHigh: londonSweep.sweptHigh,
              sweptLondonLow: londonSweep.sweptLow,
              sweptNYHigh: nySweep.sweptHigh,
              sweptNYLow: nySweep.sweptLow,
            } as any);
          }
        }

        // 5) Build ctx (include 1m candles so entryEngine/session engines can use them)
        const ctx: AggregatorContext = {
          price: s.price ?? null,
          hasOpenTrade: !!s.hasOpenTrade,
          session: s.session ?? null,

          isNYSession: nextIsNYSession,

          twentyEmaAboveTwoHundred: s.twentyEmaAboveTwoHundred,
          atAllTimeHigh: s.atAllTimeHigh,

          candles1m: oneMinCandles as any,

          sweptAsiaHigh: s.sweptAsiaHigh,
          sweptAsiaLow: s.sweptAsiaLow,
          sweptLondonHigh: s.sweptLondonHigh,
          sweptLondonLow: s.sweptLondonLow,
          sweptNYHigh: (s as any).sweptNYHigh ?? false,
          sweptNYLow: (s as any).sweptNYLow ?? false,

          newsImpactOn: (s as any).newsImpactOn ?? false,
        } as any;

        // 6) Run engines
        const snapshot = runAggregator(ctx, source);

        // Debug UI reads from engineStore snapshot
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

  return { etTime, isNYSession };
}
