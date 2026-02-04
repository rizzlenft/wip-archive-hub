import { motion } from "framer-motion";
import { Play, ExternalLink, Calendar, Users, Sparkles, Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import metaverseBg from "@/assets/metaverse-bg.png";

interface VideoData {
  title: string;
  videoId: string;
  thumbnail: string;
}

// The WIP Meetup YouTube channel
const CHANNEL_URL = "https://www.youtube.com/@thewipmeetup";

export const LatestEvent = () => {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

  useEffect(() => {
    const fetchLatestVideo = async () => {
      try {
        // Try fetching from YouTube RSS via a CORS proxy
        const channelId = "UCRwQrMcwYE3K7gfP5nQVgng"; // The WIP Meetup channel ID
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        
        // Try using corsproxy.io
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`;
        const response = await fetch(proxyUrl);
        const text = await response.text();
        
        // Parse the XML
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");
        const entries = xml.querySelectorAll("entry");
        
        if (entries.length > 0) {
          const firstEntry = entries[0];
          const videoId = firstEntry.querySelector("yt\\:videoId, videoId")?.textContent || "";
          const title = firstEntry.querySelector("title")?.textContent || "The WIP Meetup";
          
          if (videoId) {
            setVideo({
              title,
              videoId,
              thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            });
            return;
          }
        }
      } catch (error) {
        console.log("RSS fetch failed, using fallback:", error);
      }
      
      // Fallback to the latest known video
      setVideo({
        title: "The WIP Meetup - Latest Event",
        videoId: "bcDx_9I9vJc",
        thumbnail: "https://img.youtube.com/vi/bcDx_9I9vJc/maxresdefault.jpg",
      });
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
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-15"
        style={{ backgroundImage: `url(${metaverseBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background" />
      
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
