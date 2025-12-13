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

export function usePolygonLive() {
  const setPrice = useSpiceStore((s) => s.setPrice);

  const updateFromTick = useCandleStore((s) => s.updateFromTick);
  const seedHistory = useCandleStore((s) => s.seedHistory);

  const lastPriceRef = useRef<number | null>(null);

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

        if (lastPriceRef.current !== p) {
          lastPriceRef.current = p;
          setPrice(p);
          updateFromTick(p, Date.now());
        }
      } catch {
        // ignore
      }
    };

    const fetchCandles = async () => {
      try {
        const res = await fetch("/api/polygon/candles", { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as { candles?: ApiCandle[] };
        if (cancelled) return;

        if (Array.isArray(data.candles) && data.candles.length > 0) {
          seedHistory(
            "1m",
            data.candles.map((c) => ({
              t: c.t,
              o: c.o,
              h: c.h,
              l: c.l,
              c: c.c,
              closed: true,
            }))
          );
        }
      } catch {
        // ignore
      }
    };

    fetchPrice();
    fetchCandles();

    const priceId = setInterval(fetchPrice, 500);
    const candleId = setInterval(fetchCandles, 30_000);

    return () => {
      cancelled = true;
      clearInterval(priceId);
      clearInterval(candleId);
    };
  }, [setPrice, updateFromTick, seedHistory]);
}
