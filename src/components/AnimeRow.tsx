import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AnimeCard from "./AnimeCard";
import type { AnimeMedia } from "@/services/anilist";

interface AnimeRowProps {
  title: string;
  animeList: AnimeMedia[];
  isLoading?: boolean;
}

const SkeletonCard = () => (
  <div className="flex-shrink-0 w-[160px] sm:w-[180px] glass-card overflow-hidden">
    <div className="aspect-[3/4] bg-muted animate-pulse rounded-t-xl" />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-muted rounded animate-pulse" />
      <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
    </div>
  </div>
);

const AnimeRow = ({ title, animeList, isLoading }: AnimeRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = dir === "left" ? -400 : 400;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="relative group/row">
      <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-4 px-4 sm:px-0">
        {title}
      </h2>
      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center bg-gradient-to-r from-background to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-0 pb-4"
        >
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : animeList.map((anime) => <AnimeCard key={anime.id} anime={anime} />)}
        </div>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-10 flex items-center justify-center bg-gradient-to-l from-background to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronRight className="h-6 w-6 text-foreground" />
        </button>
      </div>
    </section>
  );
};

export default AnimeRow;
