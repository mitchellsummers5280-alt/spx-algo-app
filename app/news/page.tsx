import NewsFeed from "@/components/news/NewsFeed";
import { fetchLatestNews } from "@/engines/newsEngine";
import { useAppStore } from "@/lib/appStore";

export default async function NewsPage() {
  const news = await fetchLatestNews();
  useAppStore.getState().setLatestNews(news);

  return (
    <div className="max-w-3xl mx-auto mt-6">
      <NewsFeed />
    </div>
  );
}
