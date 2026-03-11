import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchNewsletters, type NewsletterIssue } from "@/lib/newsletter";

const API_BASE =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  "https://api.thewipmeetup.com";

const DISCORD_URL = "https://discord.gg/XHDcUdm3";

export const ThisWeekCard = () => {
  const [issue, setIssue] = useState<NewsletterIssue | null>(null);

  useEffect(() => {
    fetchNewsletters()
      .then((all) => {
        const published = all
          .filter((i) => i.status === "published")
          .sort(
            (a, b) =>
              new Date(b.published_at || b.created_at).getTime() -
              new Date(a.published_at || a.created_at).getTime()
          );
        if (published.length > 0) setIssue(published[0]);
      })
      .catch(() => {});
  }, []);

  if (!issue || !issue.speakers?.length) return null;

  const eventDate = new Date(issue.week_of || issue.published_at || issue.created_at);
  const speakers = issue.speakers;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="w-full max-w-2xl mx-auto px-4"
    >
      <div className="relative rounded-2xl border border-primary/40 bg-card/80 backdrop-blur-md p-6 sm:p-8 overflow-hidden shadow-[0_0_30px_hsl(var(--primary)/0.15),inset_0_1px_0_hsl(var(--primary)/0.1)]">
        {/* Glowing border effect */}
        <div className="absolute inset-0 rounded-2xl border border-primary/20 animate-pulse pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            This Week on WIP
          </span>
        </div>

        {/* Speakers */}
        <div className="space-y-4">
          {speakers.map((speaker) => (
            <div key={speaker.name} className="flex items-center gap-4">
              <img
                src={
                  speaker.profile_image_url ||
                  `${API_BASE}/api/newsletter?action=avatar&${speaker.farcaster ? `farcaster=${encodeURIComponent(speaker.farcaster)}` : speaker.twitter ? `twitter=${encodeURIComponent(speaker.twitter)}` : `twitter=${encodeURIComponent(speaker.name)}`}`
                }
                alt={speaker.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/40 shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.name)}&background=7c3aed&color=fff&size=48`;
                }}
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-lg text-foreground truncate">
                  {speaker.name}
                </h3>
                {speaker.twitter && (
                  <a
                    href={`https://x.com/${speaker.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    @{speaker.twitter}
                  </a>
                )}
                {speaker.topic && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                    {speaker.topic}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Date + CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {eventDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              {" · "}12 PM PT
            </span>
          </div>

          <Button variant="hero" size="lg" asChild>
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
              Join Live
            </a>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
