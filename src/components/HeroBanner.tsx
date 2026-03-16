import { Link } from "react-router-dom";
import { Play, Star } from "lucide-react";
import type { AnimeMedia } from "@/services/anilist";
import heroBg from "@/assets/hero-banner.jpg";

interface HeroBannerProps {
  anime: AnimeMedia | null;
}

const HeroBanner = ({ anime }: HeroBannerProps) => {
  const title = anime ? (anime.title.english || anime.title.romaji) : "Loading...";
  const rating = anime?.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const bannerUrl = anime?.bannerImage || heroBg;

  return (
    <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
      <img
        src={bannerUrl}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="hero-gradient absolute inset-0" />
      <div className="hero-gradient-left absolute inset-0" />

      <div className="relative z-10 container mx-auto px-4 h-full flex items-end pb-16">
        <div className="max-w-xl space-y-4 animate-slide-up">
          {rating && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 text-sm font-semibold text-primary">
              <Star className="h-4 w-4 fill-primary" />
              {rating} Rating
            </div>
          )}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight">
            {title}
          </h1>
          {anime?.genres && (
            <div className="flex flex-wrap gap-2">
              {anime.genres.slice(0, 4).map((g) => (
                <span key={g} className="px-3 py-1 text-xs rounded-full bg-muted/50 backdrop-blur-sm text-muted-foreground border border-border/30">
                  {g}
                </span>
              ))}
            </div>
          )}
          {anime?.description && (
            <p className="text-sm text-muted-foreground line-clamp-3 max-w-md">
              {anime.description.replace(/<[^>]*>/g, "")}
            </p>
          )}
          {anime && (
            <Link
              to={`/anime/${anime.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors neon-glow"
            >
              <Play className="h-4 w-4 fill-current" />
              Watch Now
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
