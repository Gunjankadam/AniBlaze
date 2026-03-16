import { useQuery } from "@tanstack/react-query";
import { getAnimeById } from "@/services/anilist";
import { useFavorites } from "@/hooks/useFavorites";
import AnimeCard from "@/components/AnimeCard";
import { Heart } from "lucide-react";

const FavoritesPage = () => {
  const { favorites } = useFavorites();

  const { data: animeList, isLoading } = useQuery({
    queryKey: ["favorites", favorites],
    queryFn: async () => {
      if (favorites.length === 0) return [];
      const results = await Promise.all(favorites.map((id) => getAnimeById(id)));
      return results.filter(Boolean);
    },
    enabled: favorites.length > 0,
  });

  return (
    <div className="min-h-screen pt-32">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8 flex items-center gap-3">
          <Heart className="h-7 w-7 text-secondary" />
          My Favorites
        </h1>

        {favorites.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">No favorites yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Browse anime and click the heart icon to add favorites
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {animeList?.map((anime) => anime && <AnimeCard key={anime.id} anime={anime} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
