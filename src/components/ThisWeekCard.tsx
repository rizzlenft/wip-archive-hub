import { useState, useEffect } from "react";
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
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground uppercase tracking-widest text-center md:text-left">
        This Week
      </p>
      <div className="flex flex-col gap-2">
        {speakers.slice(0, 4).map((speaker) => (
          <div
            key={speaker.name}
            className="flex items-center gap-2.5 rounded-lg bg-card/60 border border-border/50 px-3 py-1.5"
          >
            <img
              src={
                speaker.profile_image_url ||
                `${API_BASE}/api/newsletter?action=avatar&${speaker.farcaster ? `farcaster=${encodeURIComponent(speaker.farcaster)}` : speaker.twitter ? `twitter=${encodeURIComponent(speaker.twitter)}` : `twitter=${encodeURIComponent(speaker.name)}`}`
              }
              alt={speaker.name}
              className="w-8 h-8 rounded-full object-cover border border-primary/30 shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.name)}&background=7c3aed&color=fff&size=32`;
              }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground truncate">
                  {speaker.name}
                </span>
                {speaker.twitter && (
                  <a
                    href={`https://x.com/${speaker.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline shrink-0"
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
          </div>
        ))}
      </div>
    </div>
  );
};
