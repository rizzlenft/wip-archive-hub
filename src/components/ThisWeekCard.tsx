import { useState, useEffect } from "react";
import { fetchNewsletters, type NewsletterIssue } from "@/lib/newsletter";

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
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
      {speakers.map((speaker) => (
        <span key={speaker.name} className="inline-flex items-center gap-1.5">
          {speaker.twitter ? (
            <a
              href={`https://x.com/${speaker.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              @{speaker.twitter}
            </a>
          ) : (
            <span className="text-foreground font-medium">{speaker.name}</span>
          )}
          {speaker.topic && (
            <span className="text-muted-foreground">— {speaker.topic}</span>
          )}
        </span>
      ))}
    </div>
  );
};
