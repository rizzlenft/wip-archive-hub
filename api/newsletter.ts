import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";
import { setCorsHeaders } from "../api-lib/_cors.js";

type NewsletterRecord = Record<string, unknown> & {
  id?: string;
  status?: string;
  created_at?: string;
  published_at?: string;
};

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Redis not configured: missing KV_REST_API_URL/UPSTASH_REDIS_REST_URL");
  }
  return new Redis({ url, token });
}

function parseStoredNewsletter(raw: unknown): NewsletterRecord | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as NewsletterRecord;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as NewsletterRecord;
  return null;
}

async function getNewsletterIndex(redis: Redis): Promise<string[]> {
  const raw = await redis.get<unknown>("newsletter:index");
  if (Array.isArray(raw)) return raw.filter((id): id is string => typeof id === "string");
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const redis = getRedis();
  const id = typeof req.query.id === "string" ? req.query.id : "";
  const status = typeof req.query.status === "string" ? req.query.status : "";

  if (id) {
    const newsletter = parseStoredNewsletter(await redis.get(`newsletter:${id}`));
    if (!newsletter) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ newsletter });
  }

  const index = await getNewsletterIndex(redis);
  const newsletters: NewsletterRecord[] = [];

  for (const newsletterId of index) {
    const issue = parseStoredNewsletter(await redis.get(`newsletter:${newsletterId}`));
    if (!issue) continue;
    if (status && issue.status !== status) continue;
    newsletters.push(issue);
  }

  newsletters.sort((a, b) => {
    const aTime = Date.parse(String(a.published_at || a.created_at || "")) || 0;
    const bTime = Date.parse(String(b.published_at || b.created_at || "")) || 0;
    return bTime - aTime;
  });

  return res.status(200).json({ newsletters });
}

async function handleSave(req: VercelRequest, res: VercelResponse) {
  const body = (req.body || {}) as NewsletterRecord;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return res.status(400).json({ error: "Missing newsletter id" });

  const redis = getRedis();
  const current = parseStoredNewsletter(await redis.get(`newsletter:${id}`)) || {};
  const merged = { ...current, ...body };
  await redis.set(`newsletter:${id}`, JSON.stringify(merged));

  const index = await getNewsletterIndex(redis);
  if (!index.includes(id)) {
    await redis.set("newsletter:index", [id, ...index]);
  }

  return res.status(200).json({ success: true, newsletter: merged });
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const body = (req.body || {}) as NewsletterRecord;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return res.status(400).json({ error: "Missing newsletter id" });

  const redis = getRedis();
  await redis.del(`newsletter:${id}`);
  const index = await getNewsletterIndex(redis);
  await redis.set("newsletter:index", index.filter((newsletterId) => newsletterId !== id));

  return res.status(200).json({ success: true });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET") return handleGet(req, res);

    if (req.method === "POST") {
      const action = typeof req.query.action === "string" ? req.query.action : "save";
      if (action === "delete") return handleDelete(req, res);
      if (action === "generate") {
        return res.status(503).json({
          error: "Newsletter generation is temporarily unavailable while the public archive endpoint is restored.",
        });
      }
      return handleSave(req, res);
    }

    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).end("Method Not Allowed");
  } catch (err) {
    console.error("newsletter endpoint error:", err);
    const message = err instanceof Error ? err.message : "Newsletter endpoint failed";
    return res.status(500).json({ error: message, newsletters: [] });
  }
}