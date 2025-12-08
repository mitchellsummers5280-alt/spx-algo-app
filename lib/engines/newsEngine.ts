import { NewsItem } from "@/lib/newsTypes";

export async function fetchLatestNews(): Promise<NewsItem[]> {
  try {
    // Placeholder — you’ll replace with real API call
    return [
      {
        id: "1",
        headline: "FOMC members signal more cuts possible in 2025",
        source: "Reuters",
        timestamp: Date.now(),
        sentiment: 0.4,
        impactScore: 70,
      },
      {
        id: "2",
        headline: "Tech sector weakness pulls Nasdaq lower",
        source: "Bloomberg",
        timestamp: Date.now(),
        sentiment: -0.2,
        impactScore: 55,
      },
    ];
  } catch (error) {
    console.error("News fetch failed:", error);
    return [];
  }
}

export function evaluateNewsImpact(news: NewsItem[]): number {
  if (news.length === 0) return 0;

  const avg = news.reduce((sum, item) => sum + (item.impactScore ?? 0), 0) / news.length;

  return Math.min(100, Math.round(avg));
}
