import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { fetchNewsletters, type NewsletterIssue } from "@/lib/newsletter";
import { getNextMeetupDate, isMeetupActive } from "@/lib/meetupSchedule";

const API_BASE =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  "https://api.thewipmeetup.com";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const calculateTimeLeft = (targetDate: Date): TimeLeft => {
  const difference = targetDate.getTime() - Date.now();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};

/**
 * Returns true if we're past the event window for the newsletter's week.
 * Event ends ~6 PM ET (3 PM PT) on Thursday.
 */
function isAfterEventWindow(issue: NewsletterIssue): boolean {
  const weekOf = new Date(issue.week_of || issue.published_at || issue.created_at);
  const day = weekOf.getUTCDay();
  const daysToThursday = (4 - day + 7) % 7;
  const thursday = new Date(weekOf);
  thursday.setUTCDate(thursday.getUTCDate() + daysToThursday);

  const now = new Date();
  const etParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  }).formatToParts(now);
  const tzPart = etParts.find((p) => p.type === "timeZoneName")?.value || "GMT-5";
  const match = tzPart.match(/GMT([+-])(\d+)/);
  const etOffsetHours = match ? (match[1] === "-" ? -1 : 1) * parseInt(match[2]) : -5;

  const cutoffUTC = new Date(Date.UTC(
    thursday.getUTCFullYear(),
    thursday.getUTCMonth(),
    thursday.getUTCDate(),
    18 - etOffsetHours,
    0,
    0
  ));

  return now > cutoffUTC;
}

export const ThisWeekCard = () => {
  const [targetDate] = useState(getNextMeetupDate);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(targetDate));
  const [active, setActive] = useState(isMeetupActive);
  const [issue, setIssue] = useState<NewsletterIssue | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  useEffect(() => {
    const checkActive = setInterval(() => setActive(isMeetupActive()), 30_000);
    return () => clearInterval(checkActive);
  }, []);

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

  useEffect(() => {
    if (!issue) return;
    const timer = setInterval(() => {
      setExpired(isAfterEventWindow(issue));
    }, 60_000);
    return () => clearInterval(timer);
  }, [issue]);

  if (active) return null;

  const speakers = !expired ? (issue?.speakers || []).slice(0, 2) : [];
  const countdownText = `${String(timeLeft.days).padStart(2, "0")}d ${String(timeLeft.hours).padStart(2, "0")}h ${String(timeLeft.minutes).padStart(2, "0")}m ${String(timeLeft.seconds).padStart(2, "0")}s`;

  return (
    <section className="px-4 py-5 md:py-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto flex max-w-5xl flex-col gap-3 rounded-xl border border-border/70 bg-card/55 px-4 py-3 text-left backdrop-blur-sm sm:flex-row sm:items-center sm:justify-center sm:gap-4 md:px-5"
      >
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Next meetup</span>
          <span className="text-lg font-bold text-gradient-rainbow md:text-xl">{countdownText}</span>
          <span className="text-xs text-muted-foreground">Thursday · 12 PM PT</span>
        </div>

        <div className="hidden h-8 w-px bg-border/70 sm:block" />

        <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <Sparkles className="h-4 w-4" />
            {speakers.length === 1 ? "Featured guest" : "Featured guests"}
          </div>
          {speakers.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
              {speakers.map((speaker) => (
              <a
                key={speaker.name}
                href={speaker.twitter ? `https://x.com/${speaker.twitter}` : undefined}
                target={speaker.twitter ? "_blank" : undefined}
                rel={speaker.twitter ? "noopener noreferrer" : undefined}
                className="flex min-w-0 items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-sm font-medium text-foreground transition-colors hover:bg-primary/20"
              >
                <img
                  src={
                    speaker.profile_image_url ||
                    `${API_BASE}/api/newsletter?action=avatar&${speaker.farcaster ? `farcaster=${encodeURIComponent(speaker.farcaster)}` : speaker.twitter ? `twitter=${encodeURIComponent(speaker.twitter)}` : `twitter=${encodeURIComponent(speaker.name)}`}`
                  }
                  alt={speaker.name}
                  className="h-5 w-5 shrink-0 rounded-full border border-primary/30 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.name)}&background=7c3aed&color=fff&size=40`;
                  }}
                />
                <span className="truncate">{speaker.name}</span>
              </a>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Come back soon to find out</span>
          )}
        </div>
      </motion.div>
    </section>
  );
};
