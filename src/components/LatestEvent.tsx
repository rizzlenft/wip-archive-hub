import { motion } from "framer-motion";
import { Play, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { fetchNewsletters, type NewsletterIssue } from "@/lib/newsletter";
import { EPISODES_DATA } from "@/lib/episodesData";

interface VideoData {
  title: string;
  videoId: string;
  thumbnail: string;
}

const CHANNEL_URL = "https://www.youtube.com/@thewipmeetup";
const CHANNEL_ID = "UCRwQrMcwYE3K7gfP5nQVgng";
const UPLOADS_PLAYLIST_ID = "UU" + CHANNEL_ID.slice(2);

const getYouTubeIdFromIssue = (issue: NewsletterIssue) => {
  if (issue.youtube_video_id) return issue.youtube_video_id;
  const body = `${issue.body_html || ""} ${issue.body_markdown || ""}`;
  return body.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
};

const getFallbackTitleFromIssue = (issue: NewsletterIssue) => {
  const body = issue.body_html || issue.body_markdown || "";
  return body.match(/<span[^>]*>(The WIP Meetup[^<]+)<\/span>/i)?.[1]
    ?.replace(/&#39;/g, "'")
    ?.replace(/&amp;/g, "&")
    || issue.title
    || "Latest WIP Meetup replay";
};

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

      // Primary source: latest YouTube stream from the backend scrape. The API is cached for
      // one hour, so title/thumbnail updates are picked up automatically throughout the week.
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
              thumbnail: data.thumbnail || `https://img.youtube.com/vi/${data.videoId}/maxresdefault.jpg`,
            });
            setSource(`Live via API (${data.source})`);
            return;
          }
        }
      } catch {
        // fallback
      }

      try {
        const newsletters = await fetchNewsletters();
        const withVideos = newsletters
          .map((issue) => ({ issue, videoId: getYouTubeIdFromIssue(issue) }))
          .filter((item): item is { issue: NewsletterIssue; videoId: string } => Boolean(item.videoId))
          .sort(
            (a, b) =>
              new Date(b.issue.published_at || b.issue.created_at).getTime() -
              new Date(a.issue.published_at || a.issue.created_at).getTime()
          );

        if (withVideos.length > 0) {
          const latest = withVideos[0];
          setVideo({
            title: getFallbackTitleFromIssue(latest.issue),
            videoId: latest.videoId,
            thumbnail: `https://img.youtube.com/vi/${latest.videoId}/maxresdefault.jpg`,
          });
          setSource("Newsletter replay fallback");
          return;
        }
      } catch {
        // fallback
      }

      const archiveFallback = [...EPISODES_DATA].sort(
        (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      )[0];

      if (archiveFallback) {
        setVideo({
          title: archiveFallback.title,
          videoId: archiveFallback.videoId,
          thumbnail: `https://img.youtube.com/vi/${archiveFallback.videoId}/maxresdefault.jpg`,
        });
        setSource("Static archive fallback");
        return;
      }

      setSource("Playlist embed");
      setUseFallbackEmbed(true);
    };

    fetchLatestVideo();
    const refreshTimer = window.setInterval(fetchLatestVideo, 3 * 60 * 60 * 1000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const handleThumbnailError = () => {
    if (!thumbnailError && video) {
      setThumbnailError(true);
      setVideo({ ...video, thumbnail: `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg` });
    }
  };

  return (
    <section id="about" className="relative overflow-hidden py-10 md:py-14">
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
          <div className="mb-6 text-center md:mb-8">
            <h2 className="mb-3 text-3xl font-bold leading-tight md:text-5xl">
              Watch <span className="text-gradient-rainbow">The WIP</span>
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground md:text-lg">
              Start with the latest meetup, then dig into the archive.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-xl border-glow">
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
              ) : video ? (
                <button
                  onClick={() => setIsPlaying(true)}
                  className="group w-full h-full cursor-pointer block"
                  aria-label="Play latest event video"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={handleThumbnailError}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all duration-300 shadow-2xl">
                      <Play className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground ml-1" fill="currentColor" />
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 text-left md:p-6">
                    <h4 className="mb-2 line-clamp-2 text-lg font-bold text-foreground md:text-2xl">
                      {video?.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">Click to watch</p>
                  </div>
                </button>
              ) : (
                <div className="flex h-full min-h-52 items-center justify-center bg-card/70 px-6 text-center">
                  <p className="text-sm text-muted-foreground">Loading the latest WIP video…</p>
                </div>
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

          <div className="mt-4 flex justify-center">
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
