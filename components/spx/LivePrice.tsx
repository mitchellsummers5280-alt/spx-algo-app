"use client";

import { useEffect } from "react";
import { useSpiceStore } from "lib/store/spiceStore";
import { useCandleStore } from "lib/store/candleStore";

export default function LivePrice() {
  const price = useSpiceStore((s) => s.price);
  const setPrice = useSpiceStore((s) => s.setPrice);

  // assuming candles_1 is your 1-minute candle array
  const candles1 = useCandleStore((s) => s.candles_1);

  useEffect(() => {
    if (!candles1 || candles1.length === 0) return;

    const last = candles1[candles1.length - 1];
    const close = (last as any).c ?? (last as any).close;

    if (typeof close === "number" && !Number.isNaN(close)) {
      setPrice(close);
    }
  }, [candles1, setPrice]);

  const display =
    price > 0 ? price.toFixed(2) : (candles1?.length ?? 0) === 0 ? "Waiting..." : "0.00";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        SPX Live Price (from 1m candles)
      </div>
      <div className="mt-1 text-3xl font-semibold text-emerald-400">
        {display}
      </div>
      <div className="mt-1 text-[11px] text-zinc-500">
        Candles seen: {(candles1?.length ?? 0)}
      </div>
    </div>
  );
}
