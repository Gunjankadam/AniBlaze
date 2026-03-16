import { useQuery } from "@tanstack/react-query";
import { getTrendingAnime, getPopularAnime, getUpcomingAnime } from "@/services/anilist";
import AnimeCard from "@/components/AnimeCard";

interface CategoryPageProps {
  category: "trending" | "popular" | "upcoming";
}

const titles = {
  trending: "Trending Anime",
  popular: "Popular Anime",
  upcoming: "Upcoming Anime",
};

const fetchers = {
  trending: () => getTrendingAnime(1, 30),
  popular: () => getPopularAnime(1, 30),
  upcoming: () => getUpcomingAnime(1, 30),
};

const CategoryPage = ({ category }: CategoryPageProps) => {
  const { data, isLoading } = useQuery({
    queryKey: [category],
    queryFn: fetchers[category],
  });

  return (
    <div className="min-h-screen pt-32">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">{titles[category]}</h1>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {data?.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
