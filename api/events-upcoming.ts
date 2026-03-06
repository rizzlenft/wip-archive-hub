import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getConnectUserFromRequest } from "./_connect-verify.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const user = await getConnectUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const cookieHeader = req.headers.cookie ?? "";
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((part) => {
    const [name, ...rest] = part.split("=");
    if (!name || !rest.length) return;
    cookies[name.trim()] = decodeURIComponent(rest.join("="));
  });
  const token = cookies.jwt;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const origin = process.env.NEXT_PUBLIC_BASE_URL || "";

  try {
    const eventsRes = await fetch(`${origin}/api/events-checkins`, {
      headers: {
        Cookie: `jwt=${encodeURIComponent(token)}`,
      },
    }).catch(() => null);

    if (!eventsRes || !eventsRes.ok) {
      return res
        .status(502)
        .json({ error: true, message: "Failed to load upcoming events" });
    }

    const data = (await eventsRes.json()) as {
      upcomingEvents?: unknown[];
    };

    return res.status(200).json({
      upcomingEvents: data.upcomingEvents ?? [],
    });
  } catch (err) {
    console.error("events-upcoming error:", err);
    return res.status(500).json({ error: "Failed to fetch upcoming events" });
  }
}


