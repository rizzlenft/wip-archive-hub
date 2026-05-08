import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EpisodeCard } from "./EpisodeCard";
import type { Episode } from "@/lib/youtube";

const INITIAL_VISIBLE_EPISODES = 12;
const VISIBLE_EPISODE_INCREMENT = 12;

interface EpisodeRowProps {
  year: number;
  episodes: Episode[];
  onGuestClick?: (guest: string) => void;
}

export const EpisodeRow = ({ year, episodes, onGuestClick }: EpisodeRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_EPISODES);

  const visibleEpisodes = episodes.slice(0, visibleCount);
  const remainingCount = Math.max(episodes.length - visibleEpisodes.length, 0);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, [episodes, visibleCount]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_EPISODES);
    scrollRef.current?.scrollTo({ left: 0 });
  }, [episodes]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className="relative group/row mb-12"
    >
      {/* Year Header */}
      <div className="flex items-center gap-4 mb-4 px-4 md:px-8">
        <h2 className="text-2xl md:text-3xl font-bold">
          <span className="text-gradient-rainbow">{year}</span>
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
        <span className="text-sm text-muted-foreground">
          {episodes.length} events
        </span>
      </div>

      {/* Scrollable Row Container */}
      <div className="relative">
        {/* Left Arrow */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: canScrollLeft ? 1 : 0 }}
          className="absolute left-0 top-0 bottom-0 z-20 w-12 md:w-16 bg-gradient-to-r from-background via-background/80 to-transparent flex items-center justify-start pl-2 md:pl-4"
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          aria-label={`Scroll ${year} events left`}
        >
          <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors shadow-lg">
            <ChevronLeft className="w-5 h-5" />
          </div>
        </motion.button>

        {/* Right Arrow */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: canScrollRight ? 1 : 0 }}
          className="absolute right-0 top-0 bottom-0 z-20 w-12 md:w-16 bg-gradient-to-l from-background via-background/80 to-transparent flex items-center justify-end pr-2 md:pr-4"
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          aria-label={`Scroll ${year} events right`}
        >
          <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors shadow-lg">
            <ChevronRight className="w-5 h-5" />
          </div>
        </motion.button>

        {/* Events Scroll Container */}
        <div
          ref={scrollRef}
          tabIndex={0}
          aria-label={`${year} event replays`}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-8 pb-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {visibleEpisodes.map((episode) => (
            <EpisodeCard
              key={episode.videoId}
              episode={episode}
              onGuestClick={onGuestClick}
            />
          ))}
          {remainingCount > 0 && (
            <div className="flex w-[220px] flex-shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card/40 p-4">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + VISIBLE_EPISODE_INCREMENT)}
                className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
              >
                Load {Math.min(remainingCount, VISIBLE_EPISODE_INCREMENT)} more
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
