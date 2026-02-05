import { motion } from "framer-motion";
import { Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import wipDclRizzle from "@/assets/wip-dcl-rizzle.gif";

interface VideoData {
  title: string;
  videoId: string;
  thumbnail: string;
  url: string;
}

export const FeaturedContent = () => {
  const [episodes, setEpisodes] = useState<VideoData[]>([]);
  const [thumbnailErrors, setThumbnailErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchRecentVideos = async () => {
      const channelId = "UCRwQrMcwYE3K7gfP5nQVgng";
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      
      // Try multiple CORS proxies
      const proxyConfigs = [
        { url: `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`, isJson: true },
        { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssUrl)}`, isJson: false },
      ];
      
      for (const proxy of proxyConfigs) {
        try {
          const response = await fetch(proxy.url);
          if (!response.ok) continue;
          
          let text: string;
          if (proxy.isJson) {
            const json = await response.json();
            text = json.contents;
          } else {
            text = await response.text();
          }
          
          if (!text || text.includes('Error 404') || text.includes('<!DOCTYPE html>')) {
            continue;
          }
          
          const parser = new DOMParser();
          const xml = parser.parseFromString(text, "text/xml");
          const entries = xml.querySelectorAll("entry");
          
          if (entries.length > 1) {
            // Skip the first entry (shown in LatestEvent), get the next 3
            const recentVideos: VideoData[] = [];
            
            for (let i = 1; i < Math.min(entries.length, 4); i++) {
              const entry = entries[i];
              const videoId = entry.querySelector("yt\\:videoId, videoId")?.textContent || "";
              const title = entry.querySelector("title")?.textContent || "The WIP Meetup";
              
              if (videoId) {
                recentVideos.push({
                  title,
                  videoId,
                  thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                  url: `https://www.youtube.com/watch?v=${videoId}`,
                });
              }
            }
            
            if (recentVideos.length > 0) {
              console.log("Fetched recent videos:", recentVideos.map(v => v.title));
              setEpisodes(recentVideos);
              return;
            }
          }
        } catch (error) {
          console.log(`Proxy failed:`, error);
          continue;
        }
      }
      
      // Fallback episodes if RSS fails - use known recent video IDs
      console.log("Using fallback episodes");
      setEpisodes([
        {
          title: "The WIP Meetup 291",
          videoId: "bcDx_9I9vJc",
          thumbnail: "https://img.youtube.com/vi/bcDx_9I9vJc/maxresdefault.jpg",
          url: "https://www.youtube.com/watch?v=bcDx_9I9vJc",
        },
        {
          title: "The WIP Meetup 290",
          videoId: "L6wVfn9_jlA",
          thumbnail: "https://img.youtube.com/vi/L6wVfn9_jlA/maxresdefault.jpg",
          url: "https://www.youtube.com/watch?v=L6wVfn9_jlA",
        },
        {
          title: "The WIP Meetup 289",
          videoId: "rJHxWrCHQEY",
          thumbnail: "https://img.youtube.com/vi/rJHxWrCHQEY/maxresdefault.jpg",
          url: "https://www.youtube.com/watch?v=rJHxWrCHQEY",
        },
      ]);
    };

    fetchRecentVideos();
  }, []);

  const handleThumbnailError = (videoId: string) => {
    if (!thumbnailErrors.has(videoId)) {
      setThumbnailErrors(prev => new Set(prev).add(videoId));
      // Update to hqdefault fallback
      setEpisodes(prev => prev.map(ep => 
        ep.videoId === videoId 
          ? { ...ep, thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }
          : ep
      ));
    }
  };

  return (
    <section id="content" className="py-24 relative overflow-hidden">
      {/* Background GIF */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: `url(${wipDclRizzle})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/80 to-background" />
      <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Recent <span className="text-gradient-rainbow">Episodes</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Missed a session? No worries. Catch up on our latest meetups and stay connected with the community.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {episodes.map((episode, index) => (
            <motion.a
              key={episode.videoId}
              href={episode.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="rounded-2xl overflow-hidden bg-card border-glow hover:scale-105 transition-all duration-300">
                {/* Thumbnail with overlaid title */}
                <div className="relative aspect-video bg-muted overflow-hidden">
                  <img 
                    src={episode.thumbnail}
                    alt={episode.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={() => handleThumbnailError(episode.videoId)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                  
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
                    </div>
                  </div>
                  
                  {/* Title overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                    <h3 className="font-bold text-white text-lg line-clamp-2 drop-shadow-lg">
                      {episode.title}
                    </h3>
                    <p className="text-white/70 text-xs mt-1">Click to watch</p>
                  </div>
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <Button variant="glow" size="lg" asChild>
            <a href="https://www.youtube.com/@thewipmeetup/streams" target="_blank" rel="noopener noreferrer">
              View All Episodes
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
