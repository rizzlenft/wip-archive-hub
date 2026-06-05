import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "../api-lib/_cors.js";

/**
 * GET /api/events - List partner events (no auth).
 * Proxies TokenSmart GET /api/events?partner=<CONNECT_PROJECT_ID>
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const projectId = process.env.CONNECT_PROJECT_ID;
  const base =
    process.env.TOKENSMART_URL ||
    process.env.NEXT_PUBLIC_TOKENSMART_URL ||
    "https://www.tokensmart.co";

  if (!projectId) {
    console.error("CONNECT_PROJECT_ID not set");
    return res.status(200).json({ events: [] });
  }

  try {
    const tsRes = await fetch(
      `${base}/api/events?partner=${encodeURIComponent(projectId)}`,
    );
    if (!tsRes.ok) {
      console.error("events list error", tsRes.status);
      return res.status(200).json({ events: [] });
    }
    const data = (await tsRes.json()) as { events?: unknown[] };
    return res.status(200).json({ events: data.events ?? [] });
  } catch (err) {
    console.error("events list error", err);
    return res.status(200).json({ events: [] });
  }
}
