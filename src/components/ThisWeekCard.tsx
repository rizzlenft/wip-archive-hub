import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { fetchNewsletters, type NewsletterIssue } from "@/lib/newsletter";

const API_BASE =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  "https://api.thewipmeetup.com";

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

  const speakers = issue.speakers;

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
              Featured Guests
            </h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Joining this week's meetup
          </p>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 max-w-xl mx-auto">
          {speakers.slice(0, 4).map((speaker, idx) => (
            <motion.div
              key={speaker.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card/60 backdrop-blur-sm px-4 py-3"
            >
              <img
                src={
                  speaker.profile_image_url ||
                  `${API_BASE}/api/newsletter?action=avatar&${speaker.farcaster ? `farcaster=${encodeURIComponent(speaker.farcaster)}` : speaker.twitter ? `twitter=${encodeURIComponent(speaker.twitter)}` : `twitter=${encodeURIComponent(speaker.name)}`}`
                }
                alt={speaker.name}
                className="w-10 h-10 rounded-full object-cover border border-primary/30 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.name)}&background=7c3aed&color=fff&size=40`;
                }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">
                    {speaker.name}
                  </span>
                  {speaker.twitter && (
                    <a
                      href={`https://x.com/${speaker.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      @{speaker.twitter}
                    </a>
                  )}
                </div>
                {speaker.topic && (
                  <p className="text-xs text-muted-foreground truncate">
                    {speaker.topic}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
