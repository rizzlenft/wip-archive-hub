import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getConnectUserFromRequest } from "./connect-verify";
import { setCorsHeaders } from "./_cors";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
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

  const base =
    process.env.TOKENSMART_URL ||
    process.env.NEXT_PUBLIC_TOKENSMART_URL ||
    "https://www.tokensmart.co";

  try {
    const tsRes = await fetch(`${base}/api/connect/user-events`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!tsRes.ok) {
      let body: unknown = null;
      try {
        body = await tsRes.json();
      } catch {
        // ignore
      }
      console.error("user-events error", tsRes.status, body);
      // Graceful fallback so UI still renders
      return res.status(200).json({
        user,
        checkins: [],
        upcomingEvents: [],
      });
    }

    const data = (await tsRes.json()) as {
      user?: unknown;
      checkins?: unknown[];
      upcoming_events?: unknown[];
    };

    return res.status(200).json({
      user: data.user ?? user,
      checkins: data.checkins ?? [],
      upcomingEvents: data.upcoming_events ?? [],
    });
  } catch (err) {
    console.error("events/checkins error:", err);
    // Also fall back to empty data on unexpected errors
    return res.status(200).json({
      user,
      checkins: [],
      upcomingEvents: [],
    });
  }
}

