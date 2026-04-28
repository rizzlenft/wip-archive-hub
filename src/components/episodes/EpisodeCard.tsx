import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Play, User, X } from "lucide-react";
import type { Episode } from "@/lib/youtube";

interface EpisodeCardProps {
  episode: Episode;
  onGuestClick?: (guest: string) => void;
}

export const EpisodeCard = ({ episode, onGuestClick }: EpisodeCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const handleClick = () => {
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(false);
  };

  const isMashup = /mashup\s*by\s*paradoxx/i.test(episode.title);
  const isRawFootage = /raw\s*footage/i.test(episode.title);
  const eventDate = episode.publishedAt.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  // Format a shorter title for display
  const displayTitle = episode.title
    .replace(/^The WIP Meetup\s*/i, '')
    .replace(/\s*Raw Footage\s*/gi, ' ')
    .replace(/\s*Mashup by Paradoxx\s*/gi, '')
    .replace(/\s*Mash by Paradoxx\s*/gi, '')
    .replace(/\s*Mashup\s*/gi, '')
    .trim();

  return (
    <>
      <motion.div
        className="group relative flex-shrink-0 w-[280px] cursor-pointer overflow-hidden rounded-lg border border-border/70 bg-card/60 shadow-card transition-colors hover:border-primary/50 md:w-[320px]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        whileHover={{ scale: 1.05, zIndex: 20 }}
        transition={{ duration: 0.2 }}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {thumbnailFailed ? (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card via-muted to-card px-4 text-center">
              <span className="text-sm font-semibold text-muted-foreground">The WIP Meetup</span>
            </div>
          ) : (
            <img
              src={episode.thumbnail}
              alt={episode.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
              onError={() => setThumbnailFailed(true)}
            />
          )}
          
          {/* Dark gradient overlay for title readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1.5 z-10">
            {isMashup && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-accent/90 text-accent-foreground backdrop-blur-sm shadow">
                ✂️ Mashup
              </span>
            )}
            {isRawFootage && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-muted/90 text-muted-foreground backdrop-blur-sm shadow">
                Raw
              </span>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h4 className="text-sm font-semibold text-foreground line-clamp-2 drop-shadow-lg">
              {displayTitle}
            </h4>
          </div>
          
          {/* Play button on hover */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
            </div>
          </motion.div>
        </div>

        <div className="space-y-2 p-3">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {eventDate}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-primary">
              <Play className="h-3.5 w-3.5" />
              Watch
            </span>
          </div>

          {episode.guests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {episode.guests.slice(0, 2).map(guest => (
                <button
                  key={guest}
                  onClick={(e) => {
                    e.stopPropagation();
                    onGuestClick?.(guest);
                  }}
                  className="flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary transition-colors hover:bg-primary/20"
                >
                  <User className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{guest}</span>
                </button>
              ))}
              {episode.guests.length > 2 && (
                <span className="px-1 text-xs text-muted-foreground">
                  +{episode.guests.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Video Modal */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md"
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative w-full max-w-5xl aspect-video bg-background rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`https://www.youtube.com/embed/${episode.videoId}?autoplay=1&rel=0`}
                title={episode.title}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button
                onClick={handleClose}
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 transition-colors hover:bg-background"
                aria-label="Close video"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
