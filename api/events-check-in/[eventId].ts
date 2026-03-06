import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "../_cors";

/**
 * GET /api/events-check-in/:eventId - Check if event is in check-in window (no auth).
 * Proxies TokenSmart GET /api/events/check-in/<eventId>
 */
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

  const eventId = req.query.eventId as string;
  if (!eventId) {
    return res.status(400).json({ error: "eventId required" });
  }

  const base =
    process.env.TOKENSMART_URL ||
    process.env.NEXT_PUBLIC_TOKENSMART_URL ||
    "https://www.tokensmart.co";

  try {
    const tsRes = await fetch(
      `${base}/api/events/check-in/${encodeURIComponent(eventId)}`,
    );
    if (!tsRes.ok) {
      return res.status(tsRes.status).json({
        check_in_available: false,
        error: await tsRes.text().catch(() => "Unknown"),
      });
    }
    const data = (await tsRes.json()) as {
      check_in_available?: boolean;
      scheduled_start?: string;
      scheduled_end?: string;
    };
    return res.status(200).json({
      check_in_available: data.check_in_available ?? false,
      scheduled_start: data.scheduled_start,
      scheduled_end: data.scheduled_end,
    });
  } catch (err) {
    console.error("events-check-in error", err);
    return res.status(500).json({ check_in_available: false });
  }
}
