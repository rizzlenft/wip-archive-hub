import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "./_cors.js";

/**
 * POST /api/newsletter-save
 * Body: Partial newsletter issue with required `id`
 * Merges with existing data in KV.
 * Requires env: KV_REST_API_URL, KV_REST_API_TOKEN
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).end("Method Not Allowed");
  }

  const body = req.body as Record<string, unknown>;
  const id = body?.id as string | undefined;
  if (!id) {
    return res.status(400).json({ error: "Missing newsletter id" });
  }

  try {
    const { kv } = await import("@vercel/kv");

    // Merge with existing data
    const existing = (await kv.get(`newsletter:${id}`)) as string | object | null;
    const current = existing
      ? typeof existing === "string"
        ? JSON.parse(existing)
        : existing
      : {};
    const merged = { ...current, ...body };

    await kv.set(`newsletter:${id}`, JSON.stringify(merged));

    // Ensure it's in the index
    const index = ((await kv.get("newsletter:index")) as string[] | null) || [];
    if (!index.includes(id)) {
      index.unshift(id);
      await kv.set("newsletter:index", index);
    }

    return res.status(200).json({ success: true, newsletter: merged });
  } catch (err) {
    console.error("newsletter-save error:", err);
    return res.status(500).json({ error: "Failed to save newsletter" });
  }
}
