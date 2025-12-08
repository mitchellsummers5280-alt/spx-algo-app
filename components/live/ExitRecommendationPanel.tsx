// components/live/ExitRecommendationPanel.tsx
"use client";

import type { ExitRecommendation } from "@/lib/engines/exitEngine";

const statusColorMap: Record<ExitRecommendation["status"], string> = {
  "no-trade": "border-slate-700",
  hold: "border-slate-500",
  "take-profit": "border-emerald-500",
  "cut-loss": "border-red-500",
  "scale-out": "border-amber-500",
  "time-exit": "border-blue-500",
};

export function ExitRecommendationPanel({
  recommendation,
  label,
}: {
  recommendation: ExitRecommendation;
  label?: string;
}) {
  const borderClass = statusColorMap[recommendation.status] ?? "border-slate-700";

  return (
    <div
      className={`rounded-2xl border ${borderClass} bg-slate-900/60 p-4 text-sm text-slate-100`}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          Exit Engine
        </div>
        <div className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
          {recommendation.status}
        </div>
      </div>

      {label && (
        <div className="mb-1 text-xs text-slate-400">
          Trade: <span className="font-medium text-slate-100">{label}</span>
        </div>
      )}

      <p className="text-sm leading-snug">{recommendation.message}</p>

      {typeof recommendation.riskRMultiple === "number" && (
        <div className="mt-2 text-xs text-slate-400">
          R multiple:{" "}
          <span className="font-semibold text-slate-100">
            {recommendation.riskRMultiple.toFixed(2)}R
          </span>
        </div>
      )}
    </div>
  );
}
