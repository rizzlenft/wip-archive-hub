import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "./_cors.js";

/**
 * GET /api/newsletter-list
 * Query: ?id=xxx — return single newsletter
 * Query: ?status=published — filter by status (default: all for admin, published for public)
 * Requires env: KV_REST_API_URL, KV_REST_API_TOKEN (via @vercel/kv)
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const { kv } = await import("@vercel/kv");
    const { id, status } = req.query as { id?: string; status?: string };

    // Single newsletter fetch
    if (id) {
      const raw = (await kv.get(`newsletter:${id}`)) as string | null;
      if (!raw) return res.status(404).json({ error: "Not found" });
      const newsletter = typeof raw === "string" ? JSON.parse(raw) : raw;
      return res.status(200).json({ newsletter });
    }

    // List all newsletters
    const index = ((await kv.get("newsletter:index")) as string[] | null) || [];
    const newsletters = [];

    for (const nid of index) {
      const raw = (await kv.get(`newsletter:${nid}`)) as string | null;
      if (!raw) continue;
      const issue = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (status && issue.status !== status) continue;
      newsletters.push(issue);
    }

    return res.status(200).json({ newsletters });
  } catch (err) {
    console.error("newsletter-list error:", err);
    return res.status(500).json({ error: "Failed to load newsletters", newsletters: [] });
  }
}
