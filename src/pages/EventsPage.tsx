import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthContext";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Mail, Calendar } from "lucide-react";
import { getNextMeetupDate } from "@/lib/meetupSchedule";

const API_BASE =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  "https://api.thewipmeetup.com";

type EventDetails = {
  id: string;
  name: string;
  host?: string;
  scheduled_date?: string;
  status?: string;
  description?: string;
  discord_link?: string;
};

type Checkin = {
  id: string;
  event_slug: string;
  checked_in_at: string;
  event?: EventDetails;
};

type UpcomingEvent = {
  id: string;
  name: string;
  host?: string;
  scheduled_date?: string;
  scheduled_end_date?: string;
  status?: string;
  description?: string;
  discord_link?: string;
  check_in_prompt?: string;
};

type PartnerEvent = {
  id: string;
  name: string;
  host?: string;
  scheduled_date?: string;
  scheduled_end_date?: string;
  description?: string;
  discord_link?: string;
};

type CheckInAvailability = {
  check_in_available: boolean;
  scheduled_start?: string;
  scheduled_end?: string;
};

/** One-off: live from scheduled_date to scheduled_end_date (or start + 4h if no end). */
function isEventLiveNow(event: {
  scheduled_date?: string;
  scheduled_end_date?: string;
}): boolean {
  if (!event.scheduled_date) return false;
  const start = new Date(event.scheduled_date).getTime();
  const end = event.scheduled_end_date
    ? new Date(event.scheduled_end_date).getTime()
    : start + 4 * 60 * 60 * 1000;
  const now = Date.now();
  return now >= start && now <= end;
}

function isUpcomingOrLiveEvent(event: {
  scheduled_date?: string;
  scheduled_end_date?: string;
}): boolean {
  if (!event.scheduled_date) return true;
  const start = new Date(event.scheduled_date).getTime();
  const end = event.scheduled_end_date
    ? new Date(event.scheduled_end_date).getTime()
    : start + 4 * 60 * 60 * 1000;
  return end >= Date.now();
}

type EventsResponse = {
  user: {
    sub: string;
    email?: string;
  };
  checkins: Checkin[];
  upcomingEvents: UpcomingEvent[];
};

const EventsPage = () => {
  const { user, logout } = useAuth();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [partnerEvents, setPartnerEvents] = useState<PartnerEvent[]>([]);
  const [checkInAvailability, setCheckInAvailability] = useState<
    Record<string, CheckInAvailability>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkinFeedback, setCheckinFeedback] = useState<{
    eventId: string;
    success: boolean;
    message: string;
  } | null>(null);
  const [substackEmail, setSubstackEmail] = useState("");
  const [substackStatus, setSubstackStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const nextMeetup = getNextMeetupDate();
  const nextMeetupDateEt = nextMeetup.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const nextMeetupTimeEt = nextMeetup.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const sourceEvents = partnerEvents.length > 0 ? partnerEvents : upcomingEvents;
  const upcomingDisplayEvents = sourceEvents.filter(isUpcomingOrLiveEvent);

  useEffect(() => {
    async function load() {
      try {
        const [checkinsRes, eventsRes] = await Promise.all([
          fetch(`${API_BASE}/api/events-checkins`, { credentials: "include" }),
          fetch(`${API_BASE}/api/events`),
        ]);

        if (!checkinsRes.ok) {
          throw new Error(`HTTP ${checkinsRes.status}`);
        }
        const checkinsData = (await checkinsRes.json()) as EventsResponse;
        setCheckins(checkinsData.checkins ?? []);
        setUpcomingEvents(checkinsData.upcomingEvents ?? []);

        if (eventsRes.ok) {
          const eventsData = (await eventsRes.json()) as { events: PartnerEvent[] };
          const list = eventsData.events ?? [];
          setPartnerEvents(list);
          const avail: Record<string, CheckInAvailability> = {};
          await Promise.all(
            list.map(async (ev) => {
              try {
                const r = await fetch(
                  `${API_BASE}/api/events-check-in/${encodeURIComponent(ev.id)}`,
                );
                if (r.ok) {
                  const d = (await r.json()) as CheckInAvailability;
                  avail[ev.id] = d;
                } else {
                  avail[ev.id] = { check_in_available: false };
                }
              } catch {
                avail[ev.id] = { check_in_available: false };
              }
            }),
          );
          setCheckInAvailability(avail);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load events";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function handleCheckin(eventId: string) {
    setCheckinFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/api/events-checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        setCheckinFeedback({
          eventId,
          success: false,
          message: data.error ?? "Check-in failed",
        });
        return;
      }
      setCheckinFeedback({
        eventId,
        success: true,
        message: "You're checked in!",
      });
      const checkinsRes = await fetch(`${API_BASE}/api/events-checkins`, {
        credentials: "include",
      });
      if (checkinsRes.ok) {
        const checkinsData = (await checkinsRes.json()) as EventsResponse;
        setCheckins(checkinsData.checkins ?? []);
      }
      const availRes = await fetch(
        `${API_BASE}/api/events-check-in/${encodeURIComponent(eventId)}`,
      );
      if (availRes.ok) {
        const d = (await availRes.json()) as CheckInAvailability;
        setCheckInAvailability((prev) => ({ ...prev, [eventId]: d }));
      }
    } catch (err) {
      setCheckinFeedback({
        eventId,
        success: false,
        message: err instanceof Error ? err.message : "Check-in error",
      });
    }
  }

  const layout = (content: ReactNode) => (
    <div className="min-h-screen bg-background">
      <Navigation />
      {content}
      <Footer />
    </div>
  );

  if (loading) {
    return layout(
      <main className="flex min-h-[60vh] items-center justify-center px-4 pt-24">
        <p className="text-muted-foreground">Loading your event data…</p>
      </main>
    );
  }

  if (error) {
    return layout(
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 pt-24">
        <p className="text-destructive">Error: {error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </main>
    );
  }

  return layout(
    <main className="min-h-screen px-4 pt-24 pb-12">
      <div className="container mx-auto max-w-3xl space-y-10">
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">
                Your WIP account
              </h1>
              <p className="text-muted-foreground">
                Signed in as{" "}
                <span className="font-medium text-foreground">
                  {user?.email || user?.sub}
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => void logout()}
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Your TokenSmart check-ins</h2>
          {checkins.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No check-ins found yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {checkins.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-border bg-card p-4 text-sm"
                >
                  <div className="font-medium">
                    {c.event?.name || c.event_slug}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Checked in at:{" "}
                    {new Date(c.checked_in_at).toLocaleString()}
                  </div>
                  {c.event?.scheduled_date && (
                    <div className="text-muted-foreground text-xs">
                      Event time:{" "}
                      {new Date(c.event.scheduled_date).toLocaleString()}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Next WIP Meetup — auto-computed */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Next WIP Meetup</h2>
          </div>
          <p className="text-sm text-foreground">
            {nextMeetupDateEt} at {nextMeetupTimeEt}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Every Thursday at 3:00 PM ET
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Upcoming WIP events</h2>
          {upcomingDisplayEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No upcoming events yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {upcomingDisplayEvents.map((event) => {
                const avail = checkInAvailability[event.id];
                const canCheckIn =
                  avail?.check_in_available === true ||
                  isEventLiveNow(event);
                const feedback =
                  checkinFeedback?.eventId === event.id
                    ? checkinFeedback
                    : null;
                return (
                  <li
                    key={event.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.name}</span>
                        {canCheckIn && (
                          <span className="rounded bg-destructive px-1.5 py-0.5 text-xs font-medium text-destructive-foreground">
                            LIVE
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {event.scheduled_date
                          ? new Date(event.scheduled_date).toLocaleString(
                              "en-US",
                              {
                                timeZone: "America/New_York",
                                month: "numeric",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                timeZoneName: "short",
                              },
                            )
                          : "Time TBD"}
                      </div>
                      {"check_in_prompt" in event &&
                        event.check_in_prompt && (
                          <div className="text-muted-foreground text-xs">
                            Check-in: {String(event.check_in_prompt)}
                          </div>
                        )}
                      {feedback && (
                        <p
                          className={
                            feedback.success
                              ? "text-accent text-xs"
                              : "text-destructive text-xs"
                          }
                        >
                          {feedback.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      {canCheckIn && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleCheckin(event.id)}
                        >
                          Check in
                        </Button>
                      )}
                      {event.discord_link && (
                        <a
                          href={event.discord_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          View on Discord
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Substack subscribe — inline form */}
        <section className="rounded-lg border border-border bg-secondary/30 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Stay in the loop</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Get WIP recaps, announcements, and community highlights in your inbox.
          </p>
          <form
            onSubmit={async (e: FormEvent) => {
              e.preventDefault();
              if (!substackEmail.trim()) return;

              setSubstackStatus("loading");
              try {
                const res = await fetch("/api/substack-subscribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: substackEmail.trim() }),
                });

                if (res.ok) {
                  setSubstackStatus("success");
                  setSubstackEmail("");
                  return;
                }

                setSubstackStatus("error");
              } catch {
                setSubstackStatus("error");
              }
            }}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Input
              type="email"
              required
              placeholder="your@email.com"
              value={substackEmail}
              onChange={(e) => {
                setSubstackEmail(e.target.value);
                if (substackStatus !== "idle") setSubstackStatus("idle");
              }}
              className="bg-background border-border flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={substackStatus === "loading"}
              className="shrink-0"
            >
              {substackStatus === "loading" ? "Subscribing…" : "Subscribe"}
            </Button>
          </form>
          {substackStatus === "success" && (
            <p className="text-sm text-accent">
              🎉 You're subscribed! Check your inbox.
            </p>
          )}
          {substackStatus === "error" && (
            <p className="text-sm text-destructive">
              Something went wrong. Please try again.
            </p>
          )}
        </section>
      </div>
    </main>
  );
};

export default EventsPage;

