import type { VercelRequest, VercelResponse } from "@vercel/node";

import authCallback from "./_handlers/auth-callback.js";
import authLogout from "./_handlers/auth-logout.js";
import authMe from "./_handlers/auth-me.js";
import eventsCheckin from "./_handlers/events-checkin.js";
import eventsCheckins from "./_handlers/events-checkins.js";
import events from "./_handlers/events.js";
import newsletter from "./_handlers/newsletter.js";
import ogNewsletter from "./_handlers/og-newsletter.js";
import substackSubscribe from "./_handlers/substack-subscribe.js";
import youtubeLatest from "./_handlers/youtube-latest.js";

type Handler = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>;

const ROUTES: Record<string, Handler> = {
  "auth-callback": authCallback,
  "auth-logout": authLogout,
  "auth-me": authMe,
  "events-checkin": eventsCheckin,
  "events-checkins": eventsCheckins,
  events,
  newsletter,
  "og-newsletter": ogNewsletter,
  "substack-subscribe": substackSubscribe,
  "youtube-latest": youtubeLatest,
};

function getPath(req: VercelRequest): string {
  const rawPath = req.query.path;
  const fromQuery = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
  if (typeof fromQuery === "string" && fromQuery.length > 0) return fromQuery.replace(/^\/+/, "");

  const url = new URL(req.url || "/api", "https://thewipmeetup.com");
  return url.pathname.replace(/^\/api\/?/, "").replace(/^\/+/, "");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = getPath(req);
  const [route, ...rest] = path.split("/").filter(Boolean);

  if (route === "events-check-in" && rest[0]) {
    (req.query as Record<string, unknown>).eventId = rest.join("/");
    return eventsCheckin(req, res);
  }

  const routeHandler = ROUTES[route || ""];
  if (!routeHandler) {
    return res.status(404).json({ error: "API route not found", route: route || null });
  }

  return routeHandler(req, res);
}