import { useQuery } from "@tanstack/react-query";
import { getTrendingAnime, getPopularAnime, getUpcomingAnime, getAnimeById } from "@/services/anilist";
import HeroBanner from "@/components/HeroBanner";
import AnimeRow from "@/components/AnimeRow";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { Link } from "react-router-dom";

const HomePage = () => {
  const { history } = useWatchHistory();

  const { data: trending, isLoading: trendingLoading } = useQuery({
    queryKey: ["trending"],
    queryFn: () => getTrendingAnime(1, 20),
  });

  const { data: popular, isLoading: popularLoading } = useQuery({
    queryKey: ["popular"],
    queryFn: () => getPopularAnime(1, 20),
  });

  const { data: upcoming, isLoading: upcomingLoading } = useQuery({
    queryKey: ["upcoming"],
    queryFn: () => getUpcomingAnime(1, 20),
  });

  const recentPerAnime = (() => {
    const byAnime = new Map<number, typeof history[0]>();
    for (const entry of history) {
      if (!byAnime.has(entry.animeId)) byAnime.set(entry.animeId, entry);
    }
    return Array.from(byAnime.values()).slice(0, 10);
  })();

  const { data: continueMap } = useQuery({
    queryKey: ["continue-watching", recentPerAnime.map(e => e.animeId)],
    queryFn: async () => {
      const ids = recentPerAnime.map(e => e.animeId);
      if (!ids.length) return {};
      const results = await Promise.all(ids.map(id => getAnimeById(id)));
      const map: Record<number, any> = {};
      results.forEach(a => { if (a) map[a.id] = a; });
      return map;
    },
    enabled: recentPerAnime.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen">
      <HeroBanner anime={trending?.[0] ?? null} />
      <div className="container mx-auto px-4 space-y-12 py-8 -mt-10 relative z-10">
        {recentPerAnime.length > 0 && continueMap && (
          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-foreground">Continue Watching</h2>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {recentPerAnime.map(entry => {
                const anime = continueMap[entry.animeId];
                if (!anime) return null;
                const title = anime.title.english || anime.title.romaji;
                return (
                  <Link
                    key={`${entry.animeId}-${entry.episode}`}
                    to={`/watch/${entry.animeId}/${entry.episode}`}
                    className="min-w-[160px] max-w-[180px] glass-card rounded-xl overflow-hidden border border-white/10 hover:border-primary/40 transition-all"
                  >
                    <div className="relative w-full h-40 overflow-hidden">
                      <img
                        src={anime.coverImage.large}
                        alt={title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[11px] text-white/80">
                        Episode {entry.episode}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-foreground truncate" title={title}>
                        {title}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <AnimeRow title="Trending Now" animeList={trending ?? []} isLoading={trendingLoading} />
        <AnimeRow title="Most Popular" animeList={popular ?? []} isLoading={popularLoading} />
        <AnimeRow title="Upcoming" animeList={upcoming ?? []} isLoading={upcomingLoading} />
      </div>
    </div>
  );
};

export default HomePage;
