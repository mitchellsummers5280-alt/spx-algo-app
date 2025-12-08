// app/news/page.tsx
"use client";

import NewsFeed from "@/components/news/NewsFeed";

export default function NewsPage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold text-slate-100">SPICE – News</h1>
      <NewsFeed />
    </main>
  );
}
