import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EpisodeCard } from "./EpisodeCard";
import type { Episode } from "@/lib/youtube";

interface EpisodeRowProps {
  year: number;
  episodes: Episode[];
  onGuestClick?: (guest: string) => void;
}

export const EpisodeRow = ({ year, episodes, onGuestClick }: EpisodeRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
        >
          <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors shadow-lg">
            <ChevronRight className="w-5 h-5" />
          </div>
        </motion.button>

        {/* Events Scroll Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-8 pb-20"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {episodes.map((episode) => (
            <EpisodeCard
              key={episode.videoId}
              episode={episode}
              onGuestClick={onGuestClick}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};
