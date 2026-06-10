import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";
import { setCorsHeaders } from "../api-lib/_cors.js";

type NewsletterRecord = Record<string, unknown> & {
  id?: string;
  status?: string;
  created_at?: string;
  published_at?: string;
  title?: string;
  speakers?: NewsletterSpeaker[];
};

type NewsletterSpeaker = Record<string, unknown> & {
  name?: string;
  twitter?: string;
  farcaster?: string;
  topic?: string;
  profile_image_url?: string;
};

const ALLOWED_AVATAR_HOSTS = new Set([
  "unavatar.io",
  "ui-avatars.com",
  "pbs.twimg.com",
  "res.cloudinary.com",
  "imagedelivery.net",
  "i.imgur.com",
  "cdn.discordapp.com",
  "ipfs.io",
  "gateway.pinata.cloud",
  "i.warpcast.com",
  "warpcast.com",
]);

function getRequestOrigin(req: VercelRequest): string {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) || "https";
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ||
    (req.headers.host as string | undefined) ||
    "api.thewipmeetup.com";
  return `${proto}://${host}`;
}

function tryParseUrl(raw: string): URL | null {
  try {
    return new URL(raw.trim());
  } catch {
    return null;
  }
}

function normalizeHandle(input: unknown, allowDot = false): string {
  if (typeof input !== "string") return "";
  const value = input.trim().replace(/^@/, "");
  const parsed = tryParseUrl(value.startsWith("http") ? value : `https://${value}`);
  const segment = parsed && /(?:x\.com|twitter\.com|warpcast\.com|farcaster\.xyz)$/i.test(parsed.hostname.replace(/^www\./, ""))
    ? parsed.pathname.split("/").filter(Boolean)[0] || value
    : value;
  return segment.replace(/^@/, "").replace(allowDot ? /[^a-zA-Z0-9_.-]/g : /[^a-zA-Z0-9_]/g, "");
}

function cleanTopic(topic: unknown): string | undefined {
  if (typeof topic !== "string") return undefined;
  const cleaned = topic.replace(/^(topic:\s*)+/i, "").trim();
  return cleaned || undefined;
}

function parseMeetupDate(title: unknown): string | undefined {
  if (typeof title !== "string") return undefined;
  const match = title.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (!match) return undefined;
  const [, month, day, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeNewsletterRecord(record: NewsletterRecord, apiBase: string): NewsletterRecord {
  const speakers = Array.isArray(record.speakers)
    ? record.speakers.map((speaker) => {
        const name = typeof speaker.name === "string" ? speaker.name.trim() : "";
        const twitter = normalizeHandle(speaker.twitter);
        const farcaster = normalizeHandle(speaker.farcaster, true);
        const currentAvatar = typeof speaker.profile_image_url === "string" ? speaker.profile_image_url.trim() : "";
        const avatarParams = new URLSearchParams();
        if (currentAvatar) avatarParams.set("url", currentAvatar);
        if (farcaster) avatarParams.set("farcaster", farcaster);
        if (twitter) avatarParams.set("twitter", twitter);
        if (name) avatarParams.set("name", name);

        return {
          ...speaker,
          name,
          twitter: twitter || undefined,
          farcaster: farcaster || undefined,
          topic: cleanTopic(speaker.topic),
          profile_image_url: `${apiBase}/api/newsletter?action=avatar&${avatarParams.toString()}`,
        } satisfies NewsletterSpeaker;
      })
    : [];

  return {
    ...record,
    speakers,
    event_date: parseMeetupDate(record.title),
  };
}

function isAllowedAvatarUrl(raw: string): boolean {
  const parsed = tryParseUrl(raw);
  if (!parsed || parsed.protocol !== "https:") return false;
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  return ALLOWED_AVATAR_HOSTS.has(host);
}

function fallbackAvatarUrl(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "WIP")}&background=7c3aed&color=fff&size=144&bold=true`;
}

async function fetchImage(target: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const upstream = await fetch(target, {
    redirect: "follow",
    headers: { Accept: "image/*,*/*;q=0.8", "User-Agent": "wip-newsletter-avatar-proxy" },
  });
  const contentType = upstream.headers.get("content-type") || "";
  if (!upstream.ok || !contentType.toLowerCase().startsWith("image/")) return null;
  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (buffer.length < 300) return null;
  return { buffer, contentType };
}

async function getWarpcastPfp(handle: string): Promise<string | null> {
  try {
    const profile = await fetch(`https://api.warpcast.com/v2/user-by-username?username=${encodeURIComponent(handle)}`, {
      headers: { Accept: "application/json", "User-Agent": "wip-newsletter-avatar-proxy" },
    });
    if (!profile.ok) return null;
    const data = await profile.json() as { result?: { user?: { pfp?: { url?: string } } } };
    const pfp = data.result?.user?.pfp?.url;
    return pfp && isAllowedAvatarUrl(pfp) ? pfp : null;
  } catch {
    return null;
  }
}

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
    const action = typeof req.query.action === "string" ? req.query.action : "";

    if (req.method === "GET") {
      if (action === "avatar") {
        const farcaster = typeof req.query.farcaster === "string" ? req.query.farcaster.trim() : "";
        const twitter = typeof req.query.twitter === "string" ? req.query.twitter.trim() : "";
        const name = typeof req.query.name === "string" ? req.query.name.trim() : "";

        const candidates: string[] = [];
        if (farcaster) candidates.push(`https://unavatar.io/farcaster/${encodeURIComponent(farcaster)}`);
        if (twitter) {
          candidates.push(`https://unavatar.io/x/${encodeURIComponent(twitter)}`);
          candidates.push(`https://unavatar.io/twitter/${encodeURIComponent(twitter)}`);
        }
        if (name) {
          candidates.push(`https://unavatar.io/x/${encodeURIComponent(name)}`);
          candidates.push(`https://unavatar.io/twitter/${encodeURIComponent(name)}`);
        }
        const initialsName = name || twitter || farcaster || "WIP";
        const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(initialsName)}&background=7c3aed&color=fff&size=144&bold=true`;
        candidates.push(fallback);

        for (const target of candidates) {
          try {
            const upstream = await fetch(target, { redirect: "follow" });
            const ct = upstream.headers.get("content-type") || "";
            if (!upstream.ok || !ct.startsWith("image/")) continue;
            const buf = Buffer.from(await upstream.arrayBuffer());
            if (buf.length < 200) continue; // skip tiny placeholders
            res.setHeader("Content-Type", ct || "image/png");
            res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
            return res.status(200).send(buf);
          } catch {
            continue;
          }
        }
        res.setHeader("Location", fallback);
        return res.status(302).end();
      }
      return handleGet(req, res);
    }

    if (req.method === "POST") {
      const postAction = action || "save";
      if (postAction === "delete") return handleDelete(req, res);
      if (postAction === "generate") {
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