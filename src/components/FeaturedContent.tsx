import { motion } from "framer-motion";
import { Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const recentEpisodes = [
  {
    title: "The WIP Meetup - January 2025",
    description: "Catch up on the latest discussions and community updates from our most recent session.",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    url: "https://www.youtube.com/@thewipmeetup",
    duration: "1:13:27",
  },
  {
    title: "Web3 Community Building",
    description: "Deep dive into what makes a thriving web3 community with special guests.",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    url: "https://www.youtube.com/@thewipmeetup",
    duration: "58:42",
  },
  {
    title: "Metaverse Innovations",
    description: "Exploring the latest developments in virtual worlds and spatial computing.",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    url: "https://www.youtube.com/@thewipmeetup",
    duration: "1:05:18",
  },
];

export const FeaturedContent = () => {
  return (
    <section id="content" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-card/30 to-background" />
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
          {recentEpisodes.map((episode, index) => (
            <motion.a
              key={episode.title}
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
                {/* Thumbnail */}
                <div className="relative aspect-video bg-muted overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 px-2 py-1 text-xs font-medium bg-background/80 rounded">
                    {episode.duration}
                  </span>
                </div>
                
                {/* Content */}
                <div className="p-5">
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-1">
                    {episode.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {episode.description}
                  </p>
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
            <a href="https://www.youtube.com/@thewipmeetup" target="_blank" rel="noopener noreferrer">
              View All Episodes
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
