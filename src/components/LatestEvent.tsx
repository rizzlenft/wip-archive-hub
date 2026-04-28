import { motion } from "framer-motion";
import { Play, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface VideoData {
  title: string;
  videoId: string;
  thumbnail: string;
}

const CHANNEL_URL = "https://www.youtube.com/@thewipmeetup";
const CHANNEL_ID = "UCRwQrMcwYE3K7gfP5nQVgng";
const UPLOADS_PLAYLIST_ID = "UU" + CHANNEL_ID.slice(2);

export const LatestEvent = () => {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [useFallbackEmbed, setUseFallbackEmbed] = useState(false);
  const [source, setSource] = useState<string>("");

  useEffect(() => {
    const fetchLatestVideo = async () => {
      const API_BASE =
        (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
        "https://api.thewipmeetup.com";

      // Strategy 1: Our own Vercel API
      try {
        const response = await fetch(`${API_BASE}/api/youtube-latest`, {
          signal: AbortSignal.timeout(8000),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.videoId && data.title) {
            setVideo({
              title: data.title,
              videoId: data.videoId,
              thumbnail: `https://img.youtube.com/vi/${data.videoId}/maxresdefault.jpg`,
            });
            setSource(`Live via API (${data.source})`);
            return;
          }
        }
      } catch {
        // fallback
      }

      // If live sources are unavailable, use YouTube's uploads playlist embed.
      // Do not fall back to the static episode archive here, because it can show stale events.
      setSource("Playlist embed");
      setUseFallbackEmbed(true);
    };

    fetchLatestVideo();
  }, []);

  const handleThumbnailError = () => {
    if (!thumbnailError && video) {
      setThumbnailError(true);
      setVideo({ ...video, thumbnail: `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg` });
    }
  };

  return (
    <section id="about" className="py-16 pb-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Latest Event */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto max-w-4xl"
        >
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-3xl font-bold md:text-5xl">
              Watch <span className="text-gradient-rainbow">The WIP</span>
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground md:text-lg">
              Weekly conversations, project showcases, and community sessions from the meetup archive.
            </p>
          </div>

          <div className="relative rounded-2xl overflow-hidden border-glow">
            <div className="relative aspect-video bg-card">
              {useFallbackEmbed ? (
                <iframe
                  src={`https://www.youtube.com/embed/videoseries?list=${UPLOADS_PLAYLIST_ID}&rel=0`}
                  title="Latest WIP Meetup"
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              ) : isPlaying && video ? (
                <>
                  <iframe
                    src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
                    title={video.title}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  <button
                    onClick={() => setIsPlaying(false)}
                    className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/80 hover:bg-background flex items-center justify-center transition-colors"
                    aria-label="Close video"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsPlaying(true)}
                  className="group w-full h-full cursor-pointer block"
                  aria-label="Play latest event video"
                >
                  {video && (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={handleThumbnailError}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all duration-300 shadow-2xl">
                      <Play className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground ml-1" fill="currentColor" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6 text-left">
                    <h4 className="text-xl md:text-2xl font-bold text-white mb-2 line-clamp-2">
                      {video?.title}
                    </h4>
                    <p className="text-white/70 text-sm">Click to watch</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Source badge — debug only */}
          {source && new URLSearchParams(window.location.search).has("debug") && (
            <div className="flex justify-end mt-2">
              <span className="text-xs text-muted-foreground/60 font-mono">
                Source: {source}
              </span>
            </div>
          )}

          <div className="flex justify-center mt-4">
            <Button variant="outline" size="lg" asChild>
              <a href={`${CHANNEL_URL}/streams`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-5 h-5" />
                View All Events
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
