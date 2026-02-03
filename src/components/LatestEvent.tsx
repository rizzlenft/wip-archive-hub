import { motion } from "framer-motion";
import { Play, ExternalLink, Calendar, Users, Sparkles, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface VideoData {
  title: string;
  link: string;
  thumbnail: string;
  pubDate: string;
}

const CHANNEL_ID = "UC0SZ4xz-xr4dFDX_wIBwK0g"; // The WIP Meetup channel ID
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

export const LatestEvent = () => {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestVideo = async () => {
      try {
        // Use RSS2JSON API to bypass CORS
        const response = await fetch(
          `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`
        );
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          const latest = data.items[0];
          // Extract video ID from link
          const videoId = latest.link.split("v=")[1]?.split("&")[0] || latest.guid?.split(":").pop();
          
          setVideo({
            title: latest.title,
            link: latest.link,
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            pubDate: latest.pubDate,
          });
        }
      } catch (error) {
        console.error("Failed to fetch latest video:", error);
        // Fallback to channel page
        setVideo({
          title: "Latest WIP Meetup",
          link: "https://www.youtube.com/@thewipmeetup/streams",
          thumbnail: "https://img.youtube.com/vi/UyPHBnJNT0M/maxresdefault.jpg",
          pubDate: "",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLatestVideo();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <section id="about" className="py-24 relative overflow-hidden">
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

          <a
            href={video?.link || "https://www.youtube.com/@thewipmeetup/streams"}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <div className="relative rounded-2xl overflow-hidden border-glow hover:scale-[1.02] transition-all duration-300">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-muted">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-card animate-pulse">
                    <Play className="w-16 h-16 text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <img
                      src={video?.thumbnail}
                      alt={video?.title || "Latest WIP Meetup"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                    
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all duration-300 shadow-2xl">
                        <Play className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground ml-1" fill="currentColor" />
                      </div>
                    </div>

                    {/* Video info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h4 className="text-xl md:text-2xl font-bold text-white mb-2 line-clamp-2">
                        {video?.title}
                      </h4>
                      {video?.pubDate && (
                        <p className="text-white/70 text-sm">
                          {formatDate(video.pubDate)}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </a>

          {/* CTA */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Button variant="hero" size="lg" asChild>
              <a href={video?.link || "https://www.youtube.com/@thewipmeetup/streams"} target="_blank" rel="noopener noreferrer">
                <Play className="w-5 h-5" />
                Watch Latest Event
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="https://www.youtube.com/@thewipmeetup/streams" target="_blank" rel="noopener noreferrer">
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
