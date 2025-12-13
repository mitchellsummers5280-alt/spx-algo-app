// lib/hooks/usePolygonLive.ts
"use client";

import { useEffect, useRef } from "react";
import { useSpiceStore } from "@/lib/store/spiceStore";
import { useCandleStore } from "@/lib/store/candleStore";

type ApiCandle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  closed: boolean;
};

function aggregateToTf(raw1m: Candle[], tfMs: number): Candle[] {
  // assumes raw1m sorted ascending by t
  const out: Candle[] = [];
  let cur: Candle | null = null;

  for (const x of raw1m) {
    const bucket = x.t - (x.t % tfMs);

    if (!cur || cur.t !== bucket) {
      if (cur) out.push({ ...cur, closed: true });
      cur = {
        t: bucket,
        o: x.o,
        h: x.h,
        l: x.l,
        c: x.c,
        closed: true,
      };
    } else {
      cur.h = Math.max(cur.h, x.h);
      cur.l = Math.min(cur.l, x.l);
      cur.c = x.c;
    }
  }

  if (cur) out.push({ ...cur, closed: true });
  return out;
}

export function usePolygonLive() {
  const setPrice = useSpiceStore((s) => s.setPrice);

  const updateFromTick = useCandleStore((s) => s.updateFromTick);
  const seedHistory = useCandleStore((s) => s.seedHistory);

  const lastPriceRef = useRef<number | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const fetchPrice = async () => {
      try {
        const res = await fetch("/api/spx/price", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        const p =
          typeof data === "number"
            ? data
            : typeof data?.price === "number"
            ? data.price
            : typeof data?.last === "number"
            ? data.last
            : null;

        if (cancelled || p == null) return;

        // Always set price. Only update candles on change to reduce churn.
        setPrice(p);

        if (lastPriceRef.current !== p) {
          lastPriceRef.current = p;
          updateFromTick(p, Date.now());
        }
      } catch {
        // ignore
      }
    };

    const seedCandlesOnce = async () => {
      if (seededRef.current) return;
      try {
        const res = await fetch("/api/polygon/candles", { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as { candles?: ApiCandle[] };
        if (cancelled) return;

        if (Array.isArray(data.candles) && data.candles.length > 0) {
          // Normalize + sort
          const oneMin: Candle[] = data.candles
            .map((c) => ({
              t: c.t,
              o: c.o,
              h: c.h,
              l: c.l,
              c: c.c,
              closed: true,
            }))
            .sort((a, b) => a.t - b.t);

          // ✅ seed 1m
          seedHistory("1m", oneMin);

          // ✅ derive + seed 5m from 1m history
          const fiveMin = aggregateToTf(oneMin, 5 * 60_000);
          seedHistory("5m", fiveMin);

          seededRef.current = true;
        }
      } catch {
        // ignore
      }
    };

    // initial
    fetchPrice();
    seedCandlesOnce();

    // live price polling
    const priceId = setInterval(fetchPrice, 500);

    return () => {
      cancelled = true;
      clearInterval(priceId);
    };
  }, [setPrice, updateFromTick, seedHistory]);
}
