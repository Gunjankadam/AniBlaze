import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAnimeById } from "@/services/anilist";
import { getEpisodeList } from "@/services/streaming";
import { useFavorites } from "@/hooks/useFavorites";
import { useWatchLater } from "@/hooks/useWatchLater";
import { Star, Play, Tv, Heart, Loader2, Clock } from "lucide-react";

const AnimeDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const animeId = Number(id);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isInWatchLater, toggle: toggleWatchLater } = useWatchLater();

  const { data: anime, isLoading } = useQuery({
    queryKey: ["anime", animeId],
    queryFn: () => getAnimeById(animeId),
    enabled: !!animeId,
  });

  const { data: episodeData, isLoading: episodesLoading } = useQuery({
    queryKey: ["episodes", animeId],
    queryFn: () => getEpisodeList(animeId, anime?.episodes || undefined),
    enabled: !!animeId && !isLoading,
  });

  const episodes = episodeData?.episodes || [];

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center text-muted-foreground">
        Anime not found.
      </div>
    );
  }

  const title = anime.title.english || anime.title.romaji;
  const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "N/A";
  const episodeCount = episodes.length || anime.episodes || 24;

  return (
    <div className="min-h-screen pt-32">
      {/* Banner */}
      {anime.bannerImage && (
        <div className="relative h-64 sm:h-80 w-full overflow-hidden">
          <img src={anime.bannerImage} alt="" className="w-full h-full object-cover" />
          <div className="hero-gradient absolute inset-0" />
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8 -mt-32 relative z-10">
          {/* Poster */}
          <div className="flex-shrink-0 w-56 mx-auto md:mx-0">
            <img
              src={anime.coverImage.extraLarge}
              alt={title}
              className="w-full rounded-xl shadow-2xl neon-glow"
            />
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4 pt-4 md:pt-32">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground flex-1">
                {title}
              </h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavorite(animeId)}
                  className="flex-shrink-0 p-2 rounded-full glass-card hover:border-secondary/50 transition-all"
                  aria-label={isFavorite(animeId) ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart className={`h-6 w-6 transition-colors ${isFavorite(animeId) ? "fill-secondary text-secondary" : "text-muted-foreground hover:text-secondary"}`} />
                </button>
                <button
                  onClick={() => toggleWatchLater(animeId)}
                  className="flex-shrink-0 p-2 rounded-full glass-card hover:border-primary/50 transition-all"
                  aria-label={isInWatchLater(animeId) ? "Remove from watch later" : "Add to watch later"}
                >
                  <Clock className={`h-6 w-6 transition-colors ${isInWatchLater(animeId) ? "text-primary" : "text-muted-foreground hover:text-primary"}`} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-semibold border border-primary/30">
                <Star className="h-4 w-4 fill-primary" />
                {rating}
              </span>
              {anime.format && (
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs border border-border/30">
                  {anime.format}
                </span>
              )}
              {anime.status && (
                <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs border border-border/30">
                  {anime.status.replace(/_/g, " ")}
                </span>
              )}
              {anime.episodes && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs border border-border/30">
                  <Tv className="h-3 w-3" />
                  {anime.episodes} Episodes
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {anime.genres.map((g) => (
                <span key={g} className="px-3 py-1 text-xs rounded-full bg-secondary/20 text-secondary border border-secondary/30">
                  {g}
                </span>
              ))}
            </div>

            {anime.description && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {anime.description.replace(/<[^>]*>/g, "")}
              </p>
            )}
          </div>
        </div>

        {/* Episodes */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-display font-bold text-foreground">Episodes</h2>
            {episodesLoading && (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            <span className="text-sm text-muted-foreground ml-auto">
              {episodeCount} episode{episodeCount !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {episodes.length > 0
              ? episodes.map((ep) => (
                <Link
                  key={ep.number}
                  to={`/watch/${animeId}/${ep.number}`}
                  className="glass-card p-4 text-center hover:bg-primary/10 hover:border-primary/30 transition-all group"
                >
                  <Play className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="block text-sm font-semibold text-foreground">Ep {ep.number}</span>
                  {ep.title !== `Episode ${ep.number}` && (
                    <span className="block text-[10px] text-muted-foreground truncate mt-0.5" title={ep.title}>
                      {ep.title}
                    </span>
                  )}
                </Link>
              ))
              : Array.from({ length: episodeCount }, (_, i) => i + 1).map((epNum) => (
                <Link
                  key={epNum}
                  to={`/watch/${animeId}/${epNum}`}
                  className="glass-card p-4 text-center hover:bg-primary/10 hover:border-primary/30 transition-all group"
                >
                  <Play className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-foreground">Episode {epNum}</span>
                </Link>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimeDetailsPage;
