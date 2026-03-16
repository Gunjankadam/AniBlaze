import { useQuery } from "@tanstack/react-query";
import { getAnimeById } from "@/services/anilist";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { Link } from "react-router-dom";
import { Clock, Play, Trash2 } from "lucide-react";

const HistoryPage = () => {
  const { history, clearHistory } = useWatchHistory();

  const uniqueAnimeIds = [...new Set(history.map((e) => e.animeId))];

  const { data: animeMap, isLoading } = useQuery({
    queryKey: ["history-anime", uniqueAnimeIds],
    queryFn: async () => {
      const results = await Promise.all(uniqueAnimeIds.map((id) => getAnimeById(id)));
      const map: Record<number, any> = {};
      results.forEach((a) => { if (a) map[a.id] = a; });
      return map;
    },
    enabled: uniqueAnimeIds.length > 0,
  });

  return (
    <div className="min-h-screen pt-32">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Clock className="h-7 w-7 text-primary" />
            Watch History
          </h1>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive glass-card hover:border-destructive/30 transition-all"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">No watch history yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Start watching anime to build your history
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry, i) => {
              const anime = animeMap?.[entry.animeId];
              if (!anime) return null;
              const title = anime.title.english || anime.title.romaji;
              return (
                <Link
                  key={`${entry.animeId}-${entry.episode}-${i}`}
                  to={`/watch/${entry.animeId}/${entry.episode}`}
                  className="glass-card p-4 flex items-center gap-4 hover:border-primary/30 transition-all group"
                >
                  <img
                    src={anime.coverImage.large}
                    alt={title}
                    className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Episode {entry.episode}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <Play className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
