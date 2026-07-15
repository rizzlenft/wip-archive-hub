import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";
import { getConnectUserFromRequest } from "../api-lib/_connect-verify.js";
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

function extractSpeakersFromBodyHtml(html: string): NewsletterSpeaker[] {
  if (!html) return [];
  const speakers: NewsletterSpeaker[] = [];
  const seen = new Set<string>();

  // Poster speaker cards: large 28px name heading; pull nearby avatar + socials
  const namePattern = /font-size:28px[^>]*>([^<]+)</gi;
  let match: RegExpExecArray | null;
  while ((match = namePattern.exec(html)) !== null) {
    const name = match[1].trim();
    if (!name || /^WIP$/i.test(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const start = Math.max(0, match.index - 700);
    const windowHtml = html.slice(start, match.index + 700);

    const imgMatch =
      windowHtml.match(new RegExp(`<img\\s[^>]*alt="${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`, "i")) ||
      windowHtml.match(new RegExp(`<img\\s[^>]*alt='${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'[^>]*>`, "i"));
    const src = imgMatch?.[0]?.match(/src=["']([^"']+)["']/)?.[1];

    const twitter = windowHtml.match(/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]+)/i)?.[1];
    const farcaster = windowHtml.match(/https?:\/\/(?:www\.)?warpcast\.com\/([A-Za-z0-9_.-]+)/i)?.[1];
    const topicMatch = windowHtml.match(/Topic:\s*(?:<a[^>]*>([^<]+)<\/a>|([^<]+))</i);
    const topic = (topicMatch?.[1] || topicMatch?.[2] || "").trim() || undefined;

    speakers.push({
      name,
      twitter: twitter || undefined,
      farcaster: farcaster || undefined,
      topic,
      profile_image_url: src?.startsWith("http") ? src : undefined,
    });
  }

  return speakers;
}

function extractYoutubeIdFromBodyHtml(html: string): string | undefined {
  const match = html.match(/img\.youtube\.com\/vi\/([a-zA-Z0-9_-]{11})\//);
  return match?.[1];
}

function extractRecapFromBodyHtml(html: string): string | undefined {
  const match = html.match(
    /Last Week's Recap[\s\S]{0,200}?font-size:16px[^>]*>([\s\S]*?)<\/td>/i,
  );
  if (!match?.[1]) return undefined;
  const text = match[1]
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || undefined;
}

function normalizeNewsletterRecord(record: NewsletterRecord, apiBase: string): NewsletterRecord {
  const bodyHtml = typeof record.body_html === "string" ? record.body_html : "";
  let rawSpeakers = Array.isArray(record.speakers) ? record.speakers : [];
  if (!rawSpeakers.some((s) => typeof s?.name === "string" && s.name.trim())) {
    rawSpeakers = extractSpeakersFromBodyHtml(bodyHtml);
  }

  const speakers = rawSpeakers
    .map((speaker) => {
      const name = typeof speaker.name === "string" ? speaker.name.trim() : "";
      if (!name) return null;
      const twitter = normalizeHandle(speaker.twitter);
      const farcaster = normalizeHandle(speaker.farcaster, true);
      const currentAvatar = typeof speaker.profile_image_url === "string" ? speaker.profile_image_url.trim() : "";
      const avatarParams = new URLSearchParams();
      if (currentAvatar) avatarParams.set("url", currentAvatar);
      if (farcaster) avatarParams.set("farcaster", farcaster);
      if (twitter) avatarParams.set("twitter", twitter);
      if (name) avatarParams.set("name", name);

      const normalized: NewsletterSpeaker = {
        ...speaker,
        name,
        twitter: twitter || undefined,
        farcaster: farcaster || undefined,
        topic: cleanTopic(speaker.topic),
        profile_image_url: `${apiBase}/api/newsletter?action=avatar&${avatarParams.toString()}`,
      };
      return normalized;
    })
    .filter((s): s is NewsletterSpeaker => s !== null);

  const youtubeFromHtml = extractYoutubeIdFromBodyHtml(bodyHtml);
  const recapFromHtml = extractRecapFromBodyHtml(bodyHtml);
  const recapSummary =
    (typeof record.recap_summary === "string" && record.recap_summary.trim()) ||
    recapFromHtml ||
    (speakers.length ? `ft. ${speakers.map((s) => s.name).join(", ")}` : undefined);

  return {
    ...record,
    speakers,
    recap_summary: recapSummary,
    youtube_video_id:
      (typeof record.youtube_video_id === "string" && record.youtube_video_id) ||
      youtubeFromHtml ||
      undefined,
    cover_image:
      (typeof record.cover_image === "string" && record.cover_image) ||
      (youtubeFromHtml ? `https://img.youtube.com/vi/${youtubeFromHtml}/maxresdefault.jpg` : undefined),
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
  const apiBase = getRequestOrigin(req);
  const id = typeof req.query.id === "string" ? req.query.id : "";
  const status = typeof req.query.status === "string" ? req.query.status : "";

  if (id) {
    const newsletter = parseStoredNewsletter(await redis.get(`newsletter:${id}`));
    if (!newsletter) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ newsletter: normalizeNewsletterRecord(newsletter, apiBase) });
  }

  const index = await getNewsletterIndex(redis);
  const newsletters: NewsletterRecord[] = [];

  for (const newsletterId of index) {
    const issue = parseStoredNewsletter(await redis.get(`newsletter:${newsletterId}`));
    if (!issue) continue;
    if (status && issue.status !== status) continue;
    newsletters.push(normalizeNewsletterRecord(issue, apiBase));
  }

  newsletters.sort((a, b) => {
    const aTime = Date.parse(String(a.published_at || a.created_at || "")) || 0;
    const bTime = Date.parse(String(b.published_at || b.created_at || "")) || 0;
    return bTime - aTime;
  });

  return res.status(200).json({ newsletters });
}

async function requireAuth(req: VercelRequest, res: VercelResponse) {
  const user = await getConnectUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return user;
}

async function handleSave(req: VercelRequest, res: VercelResponse) {
  if (!(await requireAuth(req, res))) return;
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
  if (!(await requireAuth(req, res))) return;
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
        const farcaster = normalizeHandle(req.query.farcaster, true);
        const twitter = normalizeHandle(req.query.twitter);
        const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
        const directUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";

        const candidates: string[] = [];
        if (directUrl && isAllowedAvatarUrl(directUrl)) candidates.push(directUrl);
        if (farcaster) {
          const warpcastPfp = await getWarpcastPfp(farcaster);
          if (warpcastPfp) candidates.push(warpcastPfp);
          candidates.push(`https://unavatar.io/farcaster/${encodeURIComponent(farcaster)}`);
        }
        if (twitter) {
          candidates.push(`https://unavatar.io/x/${encodeURIComponent(twitter)}`);
          candidates.push(`https://unavatar.io/twitter/${encodeURIComponent(twitter)}`);
        }
        if (name) {
          candidates.push(`https://unavatar.io/x/${encodeURIComponent(name)}`);
          candidates.push(`https://unavatar.io/twitter/${encodeURIComponent(name)}`);
        }
        const initialsName = name || twitter || farcaster || "WIP";
        const fallback = fallbackAvatarUrl(initialsName);
        candidates.push(fallback);

        for (const target of candidates) {
          try {
            const image = await fetchImage(target);
            if (!image) continue;
            res.setHeader("Content-Type", image.contentType || "image/png");
            res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");
            res.setHeader("Content-Length", String(image.buffer.length));
            return res.status(200).send(image.buffer);
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
          error: "Newsletter AI generation is disabled. Use the admin editor to compose drafts manually.",
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