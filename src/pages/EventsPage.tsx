import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/auth/AuthContext";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const API_BASE =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) || "";

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
  status?: string;
  description?: string;
  discord_link?: string;
  check_in_prompt?: string;
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/events-checkins`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = (await res.json()) as EventsResponse;
        setCheckins(data.checkins ?? []);
        setUpcomingEvents(data.upcomingEvents ?? []);
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
    try {
      const res = await fetch(`${API_BASE}/api/events-checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        // eslint-disable-next-line no-console
        console.error("Check-in failed", data);
        return;
      }
      // In the future we can refetch events here once the backend updates state.
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Check-in error", err);
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

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Upcoming WIP events</h2>
          {upcomingEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No upcoming events yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {upcomingEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 text-sm"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{event.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {event.scheduled_date
                        ? new Date(event.scheduled_date).toLocaleString()
                        : "Time TBD"}
                    </div>
                    {event.check_in_prompt && (
                      <div className="text-muted-foreground text-xs">
                        Check-in: {event.check_in_prompt}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {event.status === "scheduled" && (
                      <Button
                        size="xs"
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
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default EventsPage;

