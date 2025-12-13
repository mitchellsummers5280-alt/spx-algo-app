// lib/hooks/useSpiceEngine.ts
"use client";

import { useEffect } from "react";
import { runAggregator } from "@/lib/aggregator/spiceAggregator";
import { useSpiceStore } from "@/lib/store/spiceStore";
import { useEngineStore } from "@/lib/store/engineStore";

/**
 * Keeps the SPICE engine + aggregator running.
 * Safe, minimal, no UI responsibility.
 */
export function useSpiceEngine() {
  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;

      try {
        runAggregator({
          spice: useSpiceStore.getState(),
          engine: useEngineStore.getState(),
        });
      } catch {
        // swallow errors so UI never crashes
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
