import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { searchAnime } from "@/services/anilist";
import AnimeCard from "@/components/AnimeCard";
import { Search } from "lucide-react";

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQ);

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", initialQ],
    queryFn: () => searchAnime(initialQ, 1, 30),
    enabled: !!initialQ,
  });

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    }
  };

  return (
    <div className="min-h-screen pt-32">
      <div className="container mx-auto px-4">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for anime..."
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-muted/50 border border-border/50 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              autoFocus
            />
          </div>
        </form>

        {isLoading && (
          <div className="flex justify-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {results && (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {results.length} results for "{initialQ}"
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>
          </>
        )}

        {!initialQ && (
          <p className="text-center text-muted-foreground text-lg mt-12">
            Start typing to search for your favorite anime
          </p>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
