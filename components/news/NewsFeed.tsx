// components/news/NewsFeed.tsx
"use client";

export default function NewsFeed() {
  return (
    <div className="space-y-2 rounded-xl border border-slate-800 bg-black/60 p-4 text-sm text-slate-200">
      <h2 className="text-base font-semibold text-slate-100">
        SPICE News Feed (placeholder)
      </h2>
      <p className="text-xs text-slate-400">
        Live SPX news and event tracking will appear here once the data feed is
        wired in. For now this is just a placeholder so the app can build and
        deploy cleanly.
      </p>
    </div>
  );
}
