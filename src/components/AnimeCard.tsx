import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import type { AnimeMedia } from "@/services/anilist";

interface AnimeCardProps {
  anime: AnimeMedia;
}

const AnimeCard = ({ anime }: AnimeCardProps) => {
  const title = anime.title.english || anime.title.romaji;
  const rating = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "N/A";

  return (
    <Link to={`/anime/${anime.id}`} className="anime-card group flex-shrink-0 w-[160px] sm:w-[180px]">
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-xl">
        <img
          src={anime.coverImage.large}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {anime.averageScore && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/70 backdrop-blur-sm text-xs font-semibold">
            <Star className="h-3 w-3 text-primary fill-primary" />
            <span className="text-foreground">{rating}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
      </div>
    </Link>
  );
};

export default AnimeCard;
