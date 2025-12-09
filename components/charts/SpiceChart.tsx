// components/chart/SpiceChart.tsx
"use client";

import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

type SpiceChartProps = {
  timeframe?: string; // "1m", "3m", etc.
};

export function SpiceChart({ timeframe = "1m" }: SpiceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
    });

    const candleSeries = (chart as any).addCandlestickSeries();

    async function loadData() {
      const res = await fetch(`/api/spx?tf=${timeframe}&bars=800`);
      const json = await res.json();

      // json.candles already match lightweight-charts format (time in seconds)
      candleSeries.setData(
        json.candles.map((c: any) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    }

    loadData();

    const handleResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [timeframe]);

  return <div ref={containerRef} className="w-full" />;
}
