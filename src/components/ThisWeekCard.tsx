import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { fetchNewsletters, type NewsletterIssue } from "@/lib/newsletter";

const API_BASE =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  "https://api.thewipmeetup.com";

/**
 * Returns true if we're past the event window for the newsletter's week.
 * Event ends ~6 PM ET (3 PM PT) on Thursday — we check if "now" is after
 * the Thursday 6 PM ET of the issue's week.
 */
function isAfterEventWindow(issue: NewsletterIssue): boolean {
  const weekOf = new Date(issue.week_of || issue.published_at || issue.created_at);

  // Find the Thursday of that week
  const day = weekOf.getUTCDay();
  const daysToThursday = (4 - day + 7) % 7;
  const thursday = new Date(weekOf);
  thursday.setUTCDate(thursday.getUTCDate() + daysToThursday);

  // 6 PM ET = 23:00 UTC (EST) or 22:00 UTC (EDT)
  // Use Intl to get current ET offset
  const now = new Date();
  const etParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  }).formatToParts(now);
  const tzPart = etParts.find((p) => p.type === "timeZoneName")?.value || "GMT-5";
  const match = tzPart.match(/GMT([+-])(\d+)/);
  const etOffsetHours = match ? (match[1] === "-" ? -1 : 1) * parseInt(match[2]) : -5;

  // 6 PM ET in UTC
  const cutoffUTC = new Date(Date.UTC(
    thursday.getUTCFullYear(),
    thursday.getUTCMonth(),
    thursday.getUTCDate(),
    18 - etOffsetHours, // 18 ET → UTC
    0, 0
  ));

  return now > cutoffUTC;
}

export const ThisWeekCard = () => {
  const [issue, setIssue] = useState<NewsletterIssue | null>(null);
  const [expired, setExpired] = useState(false);

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
        if (published.length > 0) {
          const latest = published[0];
          setIssue(latest);
          setExpired(isAfterEventWindow(latest));
        }
      })
      .catch(() => {});
  }, []);

  // Re-check expiry every minute
  useEffect(() => {
    if (!issue) return;
    const timer = setInterval(() => {
      setExpired(isAfterEventWindow(issue));
    }, 60_000);
    return () => clearInterval(timer);
  }, [issue]);

  if (!issue) return null;

  const speakers = issue.speakers || [];

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
            {expired ? "Come back soon to find out!" : "Joining this week's meetup"}
          </p>
        </motion.div>

        {!expired && speakers.length > 0 && (
          <div className={`grid gap-3 mx-auto ${speakers.length === 1 ? 'max-w-xs' : 'sm:grid-cols-2 max-w-xl'}`}>
            {speakers.slice(0, 4).map((speaker, idx) => (
              <motion.div
                key={speaker.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.4 }}
                className={`flex items-center rounded-xl border border-border bg-card/60 backdrop-blur-sm ${speakers.length === 1 ? 'flex-col text-center gap-4 px-6 py-5' : 'gap-3 px-4 py-3'}`}
              >
                <img
                  src={
                    speaker.profile_image_url ||
                    `${API_BASE}/api/newsletter?action=avatar&${speaker.farcaster ? `farcaster=${encodeURIComponent(speaker.farcaster)}` : speaker.twitter ? `twitter=${encodeURIComponent(speaker.twitter)}` : `twitter=${encodeURIComponent(speaker.name)}`}`
                  }
                  alt={speaker.name}
                  className={`rounded-full object-cover border border-primary/30 shrink-0 ${speakers.length === 1 ? 'w-16 h-16' : 'w-10 h-10'}`}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.name)}&background=7c3aed&color=fff&size=40`;
                  }}
                />
                <div className="min-w-0">
                  <div className={`flex items-center gap-1.5 flex-wrap ${speakers.length === 1 ? 'justify-center' : ''}`}>
                    <span className={`font-semibold text-foreground ${speakers.length === 1 ? 'text-base' : 'text-sm'}`}>
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
                    <p className={`text-muted-foreground truncate ${speakers.length === 1 ? 'text-sm' : 'text-xs'}`}>
                      {speaker.topic}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
