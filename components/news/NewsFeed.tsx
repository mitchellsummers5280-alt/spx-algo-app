"use client";
import { useAppStore } from "@/lib/appStore";

export default function NewsFeed() {
  const latestNews = useAppStore((s) => s.latestNews);
  const isNewsImpactEnabled = useAppStore((s) => s.isNewsImpactEnabled);
  const toggleNewsImpact = useAppStore((s) => s.toggleNewsImpact);

  return (
    <div className="p-4 bg-black border border-slate-700 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">SPX News Feed</h2>

        <button
          onClick={toggleNewsImpact}
          className={`px-3 py-1 rounded-lg text-sm ${
            isNewsImpactEnabled ? "bg-green-600" : "bg-slate-600"
          }`}
        >
          {isNewsImpactEnabled ? "Impact ON" : "Impact OFF"}
        </button>
      </div>

      {latestNews.length === 0 && (
        <div className="text-slate-400 text-sm">No news loaded.</div>
      )}

      {latestNews.map((n) => (
        <div key={n.id} className="mb-3 border-b border-slate-700 pb-2">
          <div className="font-medium">{n.headline}</div>
          <div className="text-xs text-slate-400">{n.source}</div>
        </div>
      ))}
    </div>
  );
}
