import { motion } from "framer-motion";
import { Play, ExternalLink, Calendar, Users, Sparkles, Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface VideoData {
  title: string;
  videoId: string;
  thumbnail: string;
  pubDate: string;
}

// Fallback videos from The WIP Meetup channel (recent livestreams)
const FALLBACK_VIDEOS = [
  { videoId: "UyPHBnJNT0M", title: "The WIP Meetup - Latest Event" },
  { videoId: "L6wVfn9_jlA", title: "The WIP Meetup" },
  { videoId: "rJHxWrCHQEY", title: "The WIP Meetup" },
];

export const LatestEvent = () => {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Use the most recent known video
    const latest = FALLBACK_VIDEOS[0];
    setVideo({
      title: latest.title,
      videoId: latest.videoId,
      thumbnail: `https://img.youtube.com/vi/${latest.videoId}/maxresdefault.jpg`,
      pubDate: "",
    });
  }, []);

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
                  className="group w-full h-full cursor-pointer"
                >
                  <img
                    src={video?.thumbnail}
                    alt={video?.title || "Latest WIP Meetup"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback to hqdefault if maxresdefault fails
                      const target = e.target as HTMLImageElement;
                      if (target.src.includes('maxresdefault')) {
                        target.src = `https://img.youtube.com/vi/${video?.videoId}/hqdefault.jpg`;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  
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
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Button variant="hero" size="lg" onClick={() => setIsPlaying(true)}>
              <Play className="w-5 h-5" />
              Watch Latest Event
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
