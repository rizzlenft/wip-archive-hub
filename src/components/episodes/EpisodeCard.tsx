import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Calendar, User } from "lucide-react";
import type { Episode } from "@/lib/youtube";

interface EpisodeCardProps {
  episode: Episode;
  onGuestClick?: (guest: string) => void;
}

export const EpisodeCard = ({ episode, onGuestClick }: EpisodeCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleClick = () => {
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(false);
  };

  // Format a shorter title for display
  const displayTitle = episode.title
    .replace(/^The WIP Meetup\s*/i, '')
    .replace(/\s*Raw Footage\s*/gi, ' ')
    .replace(/\s*Mashup by Paradoxx\s*/gi, '')
    .replace(/\s*Mashup\s*/gi, '')
    .trim();

  return (
    <>
      <motion.div
        className="relative flex-shrink-0 w-[280px] md:w-[320px] cursor-pointer group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        whileHover={{ scale: 1.05, zIndex: 20 }}
        transition={{ duration: 0.2 }}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          <img
            src={episode.thumbnail}
            alt={episode.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          
          {/* Dark gradient overlay for title readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          
          {/* Title overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h4 className="text-white text-sm font-medium line-clamp-2 drop-shadow-lg">
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

        {/* Info overlay - shows on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 p-3 bg-card border border-border rounded-lg shadow-xl z-30"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Calendar className="w-3 h-3" />
                {episode.publishedAt.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>

              {episode.guests.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {episode.guests.slice(0, 3).map(guest => (
                    <button
                      key={guest}
                      onClick={(e) => {
                        e.stopPropagation();
                        onGuestClick?.(guest);
                      }}
                      className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors"
                    >
                      <User className="w-2.5 h-2.5" />
                      {guest}
                    </button>
                  ))}
                  {episode.guests.length > 3 && (
                    <span className="text-xs text-muted-foreground px-1">
                      +{episode.guests.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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
              className="relative w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl"
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
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 hover:bg-background flex items-center justify-center transition-colors z-10"
              >
                <span className="text-xl">×</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
