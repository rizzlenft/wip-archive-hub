import { motion } from "framer-motion";
import { Play, ExternalLink, Calendar, Users, Sparkles, Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { fetchAllEpisodes } from "@/lib/youtube";

interface VideoData {
  title: string;
  videoId: string;
  thumbnail: string;
}

// The WIP Meetup YouTube channel
const CHANNEL_URL = "https://www.youtube.com/@thewipmeetup";

// Get the latest video from the static episodes data (sorted by date)
async function getLatestFromStaticData(): Promise<VideoData> {
  const episodes = await fetchAllEpisodes();
  const latest = episodes[0]; // Already sorted newest first
  return {
    title: latest.title,
    videoId: latest.videoId,
    thumbnail: `https://img.youtube.com/vi/${latest.videoId}/maxresdefault.jpg`,
  };
}

export const LatestEvent = () => {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  useEffect(() => {
    const fetchLatestVideo = async () => {
      const channelId = "UCRwQrMcwYE3K7gfP5nQVgng";
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      
      // Try RSS proxies to get real-time latest video
      const proxyConfigs = [
        { url: `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`, isJson: true },
        { url: `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(rssUrl)}`, isJson: false },
        { url: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`, isJson: true, isRss2Json: true },
      ];
      
      for (const proxy of proxyConfigs) {
        try {
          const response = await fetch(proxy.url, { 
            headers: { 'Accept': 'application/xml, application/json, text/xml, */*' }
          });
          if (!response.ok) continue;
          
          // rss2json returns a clean JSON format
          if ('isRss2Json' in proxy && proxy.isRss2Json) {
            const json = await response.json();
            if (json.status === 'ok' && json.items?.length > 0) {
              const item = json.items[0];
              // Extract video ID from the link
              const videoIdMatch = item.link?.match(/[?&]v=([^&]+)/);
              const videoId = videoIdMatch?.[1] || item.guid?.split(':').pop();
              if (videoId && item.title) {
                console.log("✅ Fetched latest video via rss2json:", item.title);
                setVideo({
                  title: item.title,
                  videoId,
                  thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                });
                return;
              }
            }
            continue;
          }

          let text: string;
          if (proxy.isJson) {
            const json = await response.json();
            text = json.contents;
          } else {
            text = await response.text();
          }
          
          if (!text || text.includes('Error 404') || text.includes('<!DOCTYPE html>') || !text.includes('<entry>')) {
            continue;
          }
          
          const parser = new DOMParser();
          const xml = parser.parseFromString(text, "text/xml");
          const entries = xml.querySelectorAll("entry");
          
          if (entries.length > 0) {
            const firstEntry = entries[0];
            const videoId = firstEntry.querySelector("yt\\:videoId, videoId")?.textContent || "";
            const title = firstEntry.querySelector("title")?.textContent || "The WIP Meetup";
            
            if (videoId && title) {
              console.log("✅ Fetched latest video via RSS proxy:", title);
              setVideo({
                title,
                videoId,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
              });
              return;
            }
          }
        } catch (error) {
          console.log("Proxy failed, trying next...");
          continue;
        }
      }
      
      // Fallback: use the latest from our static episodes archive (sorted by date)
      console.log("⚠️ RSS proxies unavailable — using latest from episodes archive");
      const fallback = await getLatestFromStaticData();
      setVideo(fallback);
    };

    fetchLatestVideo();
  }, []);

  const handleThumbnailError = () => {
    if (!thumbnailError && video) {
      setThumbnailError(true);
      // Try hqdefault as fallback
      setVideo({
        ...video,
        thumbnail: `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
      });
    }
  };

  return (
    <section id="about" className="py-16 pb-8 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />
      
      {/* Background elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* About Section - Consolidated */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            What is <span className="text-gradient-rainbow">The WIP</span>?
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
            <span className="text-foreground font-semibold">WIP = Work in Progress.</span> Founded in 2019, we're the longest-running web3 metaverse meetup—
            3,700+ members gathering every Thursday at 12 PM PT on Hyperfy to share ideas, 
            explore projects, and build together. Everyone is welcome.
          </p>
          
          {/* Quick stats */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-5 h-5 text-primary" />
              <span>Every Thursday, 12 PM PT</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-5 h-5 text-primary" />
              <span>3,700+ Members</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="w-5 h-5 text-primary" />
              <span>Hyperfy Metaverse</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Since 2019</span>
            </div>
          </div>
        </motion.div>

        {/* Latest Event - Large Featured Video */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <h3 className="text-2xl md:text-3xl font-bold mb-2">
              Catch Up on the <span className="text-primary">Latest Event</span>
            </h3>
            <p className="text-muted-foreground">
              Missed the last meetup? Watch it now and stay in the loop.
            </p>
          </div>

          <div className="relative rounded-2xl overflow-hidden border-glow">
            {/* Video Player or Thumbnail */}
            <div className="relative aspect-video bg-card">
              {isPlaying && video ? (
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
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsPlaying(true)}
                  className="group w-full h-full cursor-pointer block"
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
                  
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all duration-300 shadow-2xl">
                      <Play className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground ml-1" fill="currentColor" />
                    </div>
                  </div>

                  {/* Video info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-left">
                    <h4 className="text-xl md:text-2xl font-bold text-white mb-2 line-clamp-2">
                      {video?.title}
                    </h4>
                    <p className="text-white/70 text-sm">
                      Click to watch
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-center mt-6">
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
