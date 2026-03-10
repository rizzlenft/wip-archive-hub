import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";
import { setCorsHeaders } from "./_cors.js";

/**
 * Unified newsletter endpoint:
 *   GET  /api/newsletter              → list newsletters (query: ?id=xxx or ?status=published)
 *   POST /api/newsletter?action=save  → save/update a newsletter
 *   POST /api/newsletter?action=generate → AI-generate a newsletter
 */

interface Speaker {
  name: string;
  twitter?: string;
  farcaster?: string;
  topic?: string;
  bio?: string;
  profile_image_url?: string;
}

function tryParseUrl(raw: string): URL | null {
  const v = raw.trim();
  if (!v) return null;

  try {
    return new URL(v);
  } catch {
    if (/^(?:www\.)?(x\.com|twitter\.com|warpcast\.com|farcaster\.xyz)\//i.test(v)) {
      try {
        return new URL(`https://${v}`);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeTwitterHandle(input?: string): string | undefined {
  if (!input) return undefined;
  let v = input.trim();
  if (!v) return undefined;

  v = v.replace(/^@/, "");

  const url = tryParseUrl(v);
  if (url && /(x\.com|twitter\.com)$/i.test(url.hostname.replace(/^www\./, ""))) {
    const seg = url.pathname.split("/").filter(Boolean)[0] || "";
    v = seg;
  }

  v = v.replace(/^@/, "").trim();
  v = v.replace(/[^a-zA-Z0-9_\.]/g, "");
  return v || undefined;
}

function normalizeFarcasterHandle(input?: string): string | undefined {
  if (!input) return undefined;
  let v = input.trim();
  if (!v) return undefined;

  v = v.replace(/^@/, "");

  const url = tryParseUrl(v);
  if (url && /(warpcast\.com|farcaster\.xyz)$/i.test(url.hostname.replace(/^www\./, ""))) {
    const seg = url.pathname.split("/").filter(Boolean)[0] || "";
    v = seg.startsWith("~") ? "" : seg;
  }

  v = v.replace(/^@/, "").trim();
  v = v.replace(/[^a-zA-Z0-9_\.\-]/g, "");
  return v || undefined;
}

function normalizeProfileImageUrlFromText(input?: string): string | undefined {
  if (!input) return undefined;
  const raw = input.trim();
  if (!raw) return undefined;
  if (raw.startsWith("data:")) return undefined;

  const url = tryParseUrl(raw);
  if (!url) return raw; // already a URL-ish string; let it pass

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host === "x.com" || host === "twitter.com") {
    const handle = normalizeTwitterHandle(raw);
    return handle ? `https://unavatar.io/twitter/${handle}` : undefined;
  }
  if (host === "warpcast.com" || host === "farcaster.xyz") {
    const handle = normalizeFarcasterHandle(raw);
    return handle ? `https://unavatar.io/farcaster/${handle}` : undefined;
  }

  return raw;
}

function normalizeSpeaker(s: Speaker): Speaker {
  const twitter = normalizeTwitterHandle(s.twitter);
  const farcaster = normalizeFarcasterHandle(s.farcaster);
  const profile_image_url = normalizeProfileImageUrlFromText(s.profile_image_url);

  return {
    ...s,
    twitter,
    farcaster,
    profile_image_url,
  };
}

// ─── SOCIAL MEDIA CONTENT FETCHING ──────────────────────────────────────────

interface SpeakerSocialContent {
  bio: string;
  recentPosts: string[];
  source: "farcaster" | "twitter" | "none";
}

async function fetchFarcasterContent(handle: string): Promise<SpeakerSocialContent> {
  const result: SpeakerSocialContent = { bio: "", recentPosts: [], source: "farcaster" };
  try {
    // 1. Get user profile + FID
    const userRes = await fetch(
      `https://api.warpcast.com/v2/user-by-username?username=${encodeURIComponent(handle)}`,
      { headers: { Accept: "application/json", "User-Agent": "wip-newsletter" } },
    );
    if (!userRes.ok) return result;
    const userData = await userRes.json();
    const user = userData?.result?.user;
    if (!user) return result;

    result.bio = user.profile?.bio?.text || "";
    const fid = user.fid;
    if (!fid) return result;

    // 2. Get recent casts (limit to 15, filter to text-only, pick best)
    const castsRes = await fetch(
      `https://api.warpcast.com/v2/casts?fid=${fid}&limit=15`,
      { headers: { Accept: "application/json", "User-Agent": "wip-newsletter" } },
    );
    if (!castsRes.ok) return result;
    const castsData = await castsRes.json();
    const casts = castsData?.result?.casts || [];

    for (const cast of casts) {
      const text = cast.text?.trim();
      if (!text || text.length < 20) continue; // skip very short / empty
      if (text.startsWith("RT ") || text.startsWith("@")) continue; // skip replies/RTs
      // Clean up and add (limit to 280 chars per post for prompt efficiency)
      result.recentPosts.push(text.slice(0, 280));
      if (result.recentPosts.length >= 5) break;
    }
  } catch (err) {
    console.warn(`Failed to fetch Farcaster content for @${handle}:`, err);
  }
  return result;
}

async function fetchTwitterContent(handle: string): Promise<SpeakerSocialContent> {
  const result: SpeakerSocialContent = { bio: "", recentPosts: [], source: "twitter" };

  const decodeEntities = (value: string) => value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));

  const cleanBio = (value: string) => decodeEntities(value)
    .replace(/\s+/g, " ")
    .replace(new RegExp(`^.*?@${handle}\\s+on\\s+X:?\\s*`, "i"), "")
    .replace(/^The latest posts from .*? on X\.?\s*/i, "")
    .replace(/^Watch more from .*? on X\.?\s*/i, "")
    .replace(/^.*? on X:?\s*/i, "")
    .trim();

  try {
    const endpoints = [
      `https://x.com/${encodeURIComponent(handle)}`,
      `https://twitter.com/${encodeURIComponent(handle)}`,
      `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(handle)}`,
    ];

    for (const endpoint of endpoints) {
      const profileRes = await fetch(endpoint, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
        redirect: "follow",
      });

      if (!profileRes.ok) continue;
      const html = await profileRes.text();

      const bioCandidates = [
        html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i)?.[1],
        html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i)?.[1],
        html.match(/"description"\s*:\s*"(.*?)"/i)?.[1],
        html.match(/"bio"\s*:\s*"(.*?)"/i)?.[1],
        html.match(/"profile_bio"\s*:\s*\{\s*"text"\s*:\s*"(.*?)"/i)?.[1],
      ].filter(Boolean) as string[];

      for (const candidate of bioCandidates) {
        const cleanedBio = cleanBio(candidate);
        if (cleanedBio && cleanedBio.length > 8) {
          result.bio = cleanedBio;
          break;
        }
      }

      const tweetMatches = html.match(/data-tweet-id[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi);
      if (tweetMatches) {
        for (const match of tweetMatches) {
          const textMatch = match.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
          if (!textMatch) continue;

          const text = decodeEntities(textMatch[1])
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();

          if (text.length >= 20) {
            result.recentPosts.push(text.slice(0, 280));
            if (result.recentPosts.length >= 5) break;
          }
        }
      }

      if (result.bio || result.recentPosts.length > 0) break;
    }
  } catch (err) {
    console.warn(`Failed to fetch Twitter content for @${handle}:`, err);
  }

  return result;
}

async function fetchSpeakerSocialContent(speaker: Speaker): Promise<SpeakerSocialContent> {
  const fc = normalizeFarcasterHandle(speaker.farcaster);
  const tw = normalizeTwitterHandle(speaker.twitter);

  const [fcContent, twContent] = await Promise.all([
    fc ? fetchFarcasterContent(fc) : Promise.resolve<SpeakerSocialContent>({ bio: "", recentPosts: [], source: "none" }),
    tw ? fetchTwitterContent(tw) : Promise.resolve<SpeakerSocialContent>({ bio: "", recentPosts: [], source: "none" }),
  ]);

  if (fcContent.source !== "none" || twContent.source !== "none") {
    const mergedPosts = [...fcContent.recentPosts];
    for (const post of twContent.recentPosts) {
      if (mergedPosts.length >= 8) break;
      if (!mergedPosts.includes(post)) mergedPosts.push(`[from X/Twitter] ${post}`);
    }

    return {
      bio: twContent.bio || fcContent.bio || "",
      recentPosts: mergedPosts,
      source: twContent.bio ? "twitter" : fcContent.source !== "none" ? "farcaster" : twContent.source,
    };
  }

  return { bio: "", recentPosts: [], source: "none" };
}

// ─── YOUTUBE TRANSCRIPT FETCHING ─────────────────────────────────────────────

async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  try {
    const captionRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!captionRes.ok) return "";

    const html = await captionRes.text();
    const captionMatch = html.match(/"captionTracks":\[.*?"baseUrl":"(.*?)"/);
    if (!captionMatch) return "";

    const captionUrl = captionMatch[1].replace(/\\u0026/g, "&");
    const subRes = await fetch(captionUrl, { signal: AbortSignal.timeout(8000) });
    if (!subRes.ok) return "";

    const subXml = await subRes.text();
    const transcript = subXml
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000); // Limit to avoid token overflow

    console.log(`Fetched YouTube transcript for ${videoId}: ${transcript.length} chars`);
    return transcript;
  } catch (err) {
    console.warn(`Failed to fetch YouTube transcript for ${videoId}:`, err);
    return "";
  }
}

function getRedis() {
  // Support both Vercel KV and direct Upstash env var names
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis not configured: missing KV_REST_API_URL/UPSTASH_REDIS_REST_URL");
  return new Redis({ url, token });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res, req);
    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method === "GET") {
      const action = (req.query.action as string) || "";
      if (action === "avatar") return handleAvatar(req, res);
      return handleList(req, res);
    }

    if (req.method === "POST") {
      const action = (req.query.action as string) || "save";
      if (action === "generate") return handleGenerate(req, res);
      if (action === "delete") return handleDelete(req, res);
      if (action === "send-substack") return handleSendSubstack(req, res);
      return handleSave(req, res);
    }

    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).end("Method Not Allowed");
  } catch (err) {
    console.error("newsletter top-level error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Unhandled: ${msg}` });
  }
}

// ─── AVATAR PROXY ────────────────────────────────────────────────────────────

function getRequestOrigin(req: VercelRequest): string {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) || "https";
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ||
    (req.headers.host as string | undefined) ||
    "api.thewipmeetup.com";
  return `${proto}://${host}`;
}

const ALLOWED_AVATAR_HOSTS = new Set([
  "unavatar.io",
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

function isAllowedAvatarUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (!ALLOWED_AVATAR_HOSTS.has(host)) return false;
    return true;
  } catch {
    return false;
  }
}

async function handleAvatar(req: VercelRequest, res: VercelResponse) {
  try {
    const q = req.query as { farcaster?: string; twitter?: string; url?: string };

    const fc = normalizeFarcasterHandle(q.farcaster);
    const tw = normalizeTwitterHandle(q.twitter);
    const url = q.url?.trim();

    let upstream: string | null = null;

    if (url) {
      if (!isAllowedAvatarUrl(url)) {
        return res.status(400).json({ error: "Avatar URL host not allowed" });
      }
      upstream = url;
    } else if (fc) {
      upstream = `https://unavatar.io/farcaster/${fc}`;
    } else if (tw) {
      upstream = `https://unavatar.io/twitter/${tw}`;
    }

    if (!upstream) return res.status(400).json({ error: "Missing farcaster/twitter/url" });

    let upstreamRes = await fetch(upstream, {
      redirect: "follow",
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "wip-newsletter-avatar-proxy",
      },
    });

    // Fallback: if unavatar.io failed for Farcaster, try Warpcast API directly
    if (!upstreamRes.ok && fc) {
      try {
        const warpcastApiRes = await fetch(
          `https://api.warpcast.com/v2/user-by-username?username=${encodeURIComponent(fc)}`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "wip-newsletter-avatar-proxy",
            },
          },
        );
        if (warpcastApiRes.ok) {
          const warpcastData = await warpcastApiRes.json();
          const pfpUrl =
            warpcastData?.result?.user?.pfp?.url ||
            warpcastData?.result?.user?.pfp?.verified?.[0] ||
            null;
          if (pfpUrl && isAllowedAvatarUrl(pfpUrl)) {
            upstreamRes = await fetch(pfpUrl, {
              redirect: "follow",
              headers: {
                Accept: "image/*,*/*;q=0.8",
                "User-Agent": "wip-newsletter-avatar-proxy",
              },
            });
          } else if (pfpUrl) {
            // PFP URL from an unknown host — try it anyway but verify it's an image
            upstreamRes = await fetch(pfpUrl, {
              redirect: "follow",
              headers: {
                Accept: "image/*,*/*;q=0.8",
                "User-Agent": "wip-newsletter-avatar-proxy",
              },
            });
          }
        }
      } catch {
        // Warpcast API fallback failed silently — will return original 404 below
      }
    }

    if (!upstreamRes.ok) {
      return res.status(404).json({ error: `Avatar fetch failed: HTTP ${upstreamRes.status}` });
    }

    const contentType = upstreamRes.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return res.status(415).json({ error: "Upstream did not return an image" });
    }

    const contentLength = Number(upstreamRes.headers.get("content-length") || "0");
    if (Number.isFinite(contentLength) && contentLength > 5_000_000) {
      return res.status(413).json({ error: "Avatar too large" });
    }

    const buf = Buffer.from(await upstreamRes.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    );
    res.setHeader("Content-Length", String(buf.length));
    return res.status(200).send(buf);
  } catch (err) {
    console.error("avatar proxy error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg || "Avatar proxy failed" });
  }
}

// ─── LIST ────────────────────────────────────────────────────────────────────

async function handleList(req: VercelRequest, res: VercelResponse) {
  try {
    const redis = getRedis();
    const { id, status } = req.query as { id?: string; status?: string };

    if (id) {
      const raw = await redis.get<string>(`newsletter:${id}`);
      if (!raw) return res.status(404).json({ error: "Not found" });
      const newsletter = typeof raw === "string" ? JSON.parse(raw) : raw;
      return res.status(200).json({ newsletter });
    }

    const index = (await redis.get<string[]>("newsletter:index")) || [];
    const newsletters = [];
    for (const nid of index) {
      const raw = await redis.get<string>(`newsletter:${nid}`);
      if (!raw) continue;
      const issue = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (status && issue.status !== status) continue;
      newsletters.push(issue);
    }
    return res.status(200).json({ newsletters });
  } catch (err) {
    console.error("newsletter list error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg, newsletters: [] });
  }
}

// ─── SAVE ────────────────────────────────────────────────────────────────────

async function handleSave(req: VercelRequest, res: VercelResponse) {
  const body = req.body as Record<string, unknown>;
  const id = body?.id as string | undefined;
  if (!id) return res.status(400).json({ error: "Missing newsletter id" });

  try {
    const redis = getRedis();
    const existing = await redis.get<string>(`newsletter:${id}`);
    const current = existing
      ? typeof existing === "string" ? JSON.parse(existing) : existing
      : {};
    const merged = { ...current, ...body };

    await redis.set(`newsletter:${id}`, JSON.stringify(merged));

    const index = (await redis.get<string[]>("newsletter:index")) || [];
    if (!index.includes(id)) {
      index.unshift(id);
      await redis.set("newsletter:index", index);
    }
    return res.status(200).json({ success: true, newsletter: merged });
  } catch (err) {
    console.error("newsletter save error:", err);
    return res.status(500).json({ error: "Failed to save newsletter" });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const body = req.body as Record<string, unknown>;
  const id = body?.id as string | undefined;
  if (!id) return res.status(400).json({ error: "Missing newsletter id" });

  try {
    const redis = getRedis();
    await redis.del(`newsletter:${id}`);

    // Remove from index
    const index = (await redis.get<string[]>("newsletter:index")) || [];
    const updated = index.filter((nid) => nid !== id);
    await redis.set("newsletter:index", updated);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("newsletter delete error:", err);
    return res.status(500).json({ error: "Failed to delete newsletter" });
  }
}

// ─── SEND TO SUBSTACK VIA EMAIL ──────────────────────────────────────────────

async function handleSendSubstack(req: VercelRequest, res: VercelResponse) {
  const SUBSTACK_EMAIL = process.env.SUBSTACK_IMPORT_EMAIL;
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const FROM_EMAIL = process.env.NEWSLETTER_FROM_EMAIL || "newsletter@thewipmeetup.com";

  if (!SUBSTACK_EMAIL) {
    return res.status(500).json({ error: "SUBSTACK_IMPORT_EMAIL not configured — add your Substack import email address in Vercel env vars" });
  }
  if (!SENDGRID_API_KEY) {
    return res.status(500).json({ error: "SENDGRID_API_KEY not configured — add it in Vercel env vars to enable email sending" });
  }

  const { title, body_html } = req.body as { id?: string; title?: string; body_html?: string };
  if (!title || !body_html) {
    return res.status(400).json({ error: "Missing title or body_html" });
  }

  try {
    const emailRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: SUBSTACK_EMAIL }] }],
        from: { email: FROM_EMAIL, name: "The WIP Weekly" },
        subject: title,
        content: [
          { type: "text/html", value: body_html },
        ],
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("SendGrid error:", emailRes.status, errText);
      return res.status(502).json({ error: `Email send failed: HTTP ${emailRes.status}` });
    }

    console.log(`Newsletter "${title}" sent to Substack via ${SUBSTACK_EMAIL}`);
    return res.status(200).json({ success: true, message: "Sent to Substack import email" });
  } catch (err) {
    console.error("send-substack error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}

async function handleGenerate(req: VercelRequest, res: VercelResponse) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error:
        "GEMINI_API_KEY not configured — add it in Vercel env vars (get one free at aistudio.google.com)",
    });
  }

  const { speakers, transcript, youtube_video_id, custom_image_urls } = req.body as {
    speakers?: Speaker[];
    transcript?: string;
    youtube_video_id?: string;
    custom_image_urls?: string[];
  };

  if (!speakers || speakers.length === 0) {
    return res.status(400).json({ error: "At least one speaker is required" });
  }

  const normalizedSpeakers = speakers.map(normalizeSpeaker);

  // ── Auto-fetch last week's speakers & video ID from the most recent published newsletter ──
  let lastWeekSpeakers: Speaker[] = [];
  let lastWeekTitle = "";
  let lastWeekVideoId = "";
  try {
    const redis = getRedis();
    const index = (await redis.get<string[]>("newsletter:index")) || [];
    for (const nid of index) {
      const raw = await redis.get<string>(`newsletter:${nid}`);
      if (!raw) continue;
      const issue = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (issue.status === "published" && issue.speakers?.length > 0) {
        lastWeekSpeakers = (issue.speakers as Speaker[]).map(normalizeSpeaker);
        lastWeekTitle = issue.title || "";
        lastWeekVideoId = issue.youtube_video_id || "";
        break; // most recent published
      }
    }
  } catch (err) {
    console.warn("Failed to fetch previous newsletter speakers:", err);
  }

  // ── Auto-fetch YouTube transcript for current video ──────────────────────
  let autoTranscript = "";
  if (youtube_video_id && !transcript) {
    autoTranscript = await fetchYouTubeTranscript(youtube_video_id);
  }
  const effectiveTranscript = transcript || autoTranscript;

  // ── Auto-fetch last week's YouTube transcript for recap synopsis ─────────
  // If no previous newsletter exists, fall back to using the current video for recap
  if (!lastWeekVideoId && youtube_video_id) {
    lastWeekVideoId = youtube_video_id;
    console.log("No previous newsletter found — using current video for recap transcript");
  }
  let lastWeekTranscript = "";
  if (lastWeekVideoId) {
    lastWeekTranscript = await fetchYouTubeTranscript(lastWeekVideoId);
    if (lastWeekTranscript) {
      console.log(`Auto-fetched last week's transcript (${lastWeekVideoId}): ${lastWeekTranscript.length} chars`);
    }
  }

  // Fetch the YouTube video title for overlay on the thumbnail
  let lastWeekVideoTitle = "";
  if (lastWeekVideoId) {
    try {
      const ytRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${lastWeekVideoId}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (ytRes.ok) {
        const ytData = await ytRes.json() as { title?: string };
        lastWeekVideoTitle = ytData.title || "";
        console.log(`Fetched video title: "${lastWeekVideoTitle}"`);
      }
    } catch {
      console.log("Could not fetch video title for overlay");
    }
  }

  let videoContext = "";
  if (youtube_video_id) {
    videoContext = `\nThe latest WIP Meetup recording: https://youtube.com/watch?v=${youtube_video_id}
YouTube Thumbnail (MUST include as clickable image): https://img.youtube.com/vi/${youtube_video_id}/maxresdefault.jpg`;
  }

  const origin = getRequestOrigin(req);
  const avatarBase = `${origin}/api/newsletter?action=avatar`;

  // Ensure speaker profile images are ALWAYS same-origin (proxy) to avoid ORB/CORS breaks in the browser.
  const speakersWithImages = normalizedSpeakers.map((s) => {
    const alreadyProxied = typeof s.profile_image_url === "string" && s.profile_image_url.startsWith(avatarBase);

    if (alreadyProxied) return s;

    if (s.profile_image_url) {
      return { ...s, profile_image_url: `${avatarBase}&url=${encodeURIComponent(s.profile_image_url)}` };
    }
    if (s.farcaster) {
      return { ...s, profile_image_url: `${avatarBase}&farcaster=${encodeURIComponent(s.farcaster)}` };
    }
    if (s.twitter) {
      return { ...s, profile_image_url: `${avatarBase}&twitter=${encodeURIComponent(s.twitter)}` };
    }
    return s;
  });

  // ── Fetch real social media content for each speaker ──────────────────
  console.log("Fetching social media content for speakers...");
  const socialContentMap = new Map<string, SpeakerSocialContent>();
  await Promise.all(
    speakersWithImages.map(async (s) => {
      const content = await fetchSpeakerSocialContent(s);
      socialContentMap.set(s.name, content);
      console.log(
        `Social content for ${s.name}: bio=${content.bio.length}chars, posts=${content.recentPosts.length}, source=${content.source}`,
      );
    }),
  );

  const speakerList = speakersWithImages
    .map((s) => {
      const tw = normalizeTwitterHandle(s.twitter);
      const fc = normalizeFarcasterHandle(s.farcaster);
      const social = socialContentMap.get(s.name);
      const bioText = social?.bio || s.bio || "";
      let bioSection = "";
      if (bioText) {
        bioSection = `\n    BIO (use this as their description/tagline on their card): "${bioText}"`;
      } else {
        bioSection = `\n    (No bio available — show only their name, PFP, social links, and topic)`;
      }
      return `- ${s.name}${s.profile_image_url ? ` [PROFILE IMAGE: ${s.profile_image_url}]` : ""}${tw ? ` (@${tw} on X/Twitter, link: https://x.com/${tw})` : ""}${fc ? ` (@${fc} on Farcaster, link: https://farcaster.xyz/${fc})` : ""}${s.topic ? ` — Topic: ${s.topic}` : ""}${bioSection}`;
    })
    .join("\n");

  // Build last week's speakers context with proxied PFPs
  const lastWeekSpeakersWithImages = lastWeekSpeakers.map((s) => {
    if (s.profile_image_url?.startsWith(avatarBase)) return s;
    if (s.profile_image_url) return { ...s, profile_image_url: `${avatarBase}&url=${encodeURIComponent(s.profile_image_url)}` };
    if (s.farcaster) return { ...s, profile_image_url: `${avatarBase}&farcaster=${encodeURIComponent(s.farcaster)}` };
    if (s.twitter) return { ...s, profile_image_url: `${avatarBase}&twitter=${encodeURIComponent(s.twitter)}` };
    return s;
  });

  const lastWeekSpeakerList = lastWeekSpeakersWithImages.length > 0
    ? lastWeekSpeakersWithImages.map((s) => {
        const tw = normalizeTwitterHandle(s.twitter);
        const fc = normalizeFarcasterHandle(s.farcaster);
        return `- ${s.name}${s.profile_image_url ? ` [PROFILE IMAGE: ${s.profile_image_url}]` : ""}${tw ? ` (@${tw}, link: https://x.com/${tw})` : ""}${fc ? ` (@${fc}, link: https://farcaster.xyz/${fc})` : ""}`;
      }).join("\n")
    : "(No previous speakers found)";

  const customImagesContext =
    custom_image_urls && custom_image_urls.length > 0
      ? `\n\nCUSTOM EVENT IMAGES FROM LAST WEEK (these are community photos from LAST WEEK's event — NOT this week's speakers):
${custom_image_urls.map((url, i) => `- Image ${i + 1}: ${url}`).join("\n")}
Use these subtly and only where readability is preserved. If there are 2 or more images, Image 2 MUST be used as the standalone image at the VERY BOTTOM of the recap section after all text and CTAs — never behind a heading, synopsis, or body text.`
      : "";

  const transcriptSection = effectiveTranscript
    ? `\n\nHere is a transcript/notes from last week's event. THIS IS CRITICAL — you MUST extract the 2-3 most INSIGHTFUL, thought-provoking, or exciting quotes. Look for:
- Bold predictions about Web3/metaverse/tech that would make someone stop scrolling
- Funny or memorable one-liners that capture the community vibe  
- Controversial or surprising takes that spark curiosity
- Moments of real insight that show WHY this community is worth joining

Feature these quotes PROMINENTLY as massive pull-quotes (28-36px) with decorative oversized quotation marks. Each quote should feel like a reason to attend the next event.

TRANSCRIPT:\n${effectiveTranscript}`
    : "\n\n(No transcript provided — create a brief general recap mentioning the speakers and topics.)";

  // Rotating visual themes for week-to-week variety
  const visualThemes = [
    {
      name: "Block Party",
      vibe: "street art, bold graffiti typography, neon spray-paint accents, warehouse party energy, brick texture backgrounds",
      accent1: "#ff2d55",
      accent2: "#ffcc00",
      accent3: "#00ff88",
    },
    {
      name: "Indie Concert Poster",
      vibe: "vintage gig poster, torn paper edges, halftone dots, bold woodblock type, underground music venue energy",
      accent1: "#ff6b35",
      accent2: "#f7c948",
      accent3: "#7b61ff",
    },
    {
      name: "Cyberpunk Rave",
      vibe: "glitch art, scan lines, terminal green on black, futuristic HUD elements, matrix-style rain effects",
      accent1: "#00ffcc",
      accent2: "#ff00ff",
      accent3: "#00ccff",
    },
    {
      name: "Zine Culture",
      vibe: "cut-and-paste collage, xerox aesthetic, punk DIY energy, handwritten annotations, photocopied textures",
      accent1: "#ff4081",
      accent2: "#e0e0e0",
      accent3: "#ffeb3b",
    },
    {
      name: "Festival Wristband",
      vibe: "music festival lineup poster, sunset gradient vibes, psychedelic swirls, Coachella meets Burning Man energy",
      accent1: "#ff6ec7",
      accent2: "#7b68ee",
      accent3: "#ffa500",
    },
    {
      name: "Gallery Opening",
      vibe: "minimalist art gallery invite, stark contrasts, elegant sans-serif, single bold accent color, sophisticated rebel energy",
      accent1: "#ff3366",
      accent2: "#ffffff",
      accent3: "#1a1a2e",
    },
    {
      name: "Retro Arcade",
      vibe: "pixel art borders, 8-bit style decorations, CRT screen glow, neon cabinet colors, press-start energy",
      accent1: "#39ff14",
      accent2: "#ff073a",
      accent3: "#0ff",
    },
  ];
  const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const theme = visualThemes[weekIndex % visualThemes.length];

  const WIP_LOGO_URL = "https://thewipmeetup.com/images/wip-logo-static.png";
  const WIP_LOGO_GIF_URL = "https://wip-archive-hub.lovable.app/images/wip-logo.gif";

  // Compute next Thursday date for the title
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun
  let daysUntilThursday = (4 - dayOfWeek + 7) % 7;
  if (daysUntilThursday === 0) daysUntilThursday = 7; // if today is Thursday, next one
  const nextThursday = new Date(now);
  nextThursday.setUTCDate(nextThursday.getUTCDate() + daysUntilThursday);
  const meetupDateStr = `${nextThursday.getUTCMonth() + 1}/${nextThursday.getUTCDate()}/${nextThursday.getUTCFullYear()}`;

  // Inline SVG fallback for the WIP logo (simple "WIP" text badge) encoded as a data URI
  const WIP_LOGO_FALLBACK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='16' fill='%230a0612'/%3E%3Crect x='2' y='2' width='76' height='76' rx='14' fill='none' stroke='%23e84393' stroke-width='3'/%3E%3Ctext x='40' y='48' font-family='Arial,sans-serif' font-size='28' font-weight='bold' fill='%23f5f0e8' text-anchor='middle'%3EWIP%3C/text%3E%3C/svg%3E`;

  const transcriptQuoteNote = effectiveTranscript
    ? `\nPULL-QUOTES FROM TRANSCRIPT (LAST WEEK'S RECAP ONLY):
- Extract 2-3 of the most INSIGHTFUL quotes from the transcript for the RECAP section
- These are REAL quotes from last week's event and CAN be used
- Display as MASSIVE pull-quotes (28-36px font) with oversized decorative quotation marks
- Show the speaker's circular PFP next to their quote attribution\n`
    : "";

  const systemPrompt = `You are the creative director of "The WIP Weekly" — the weekly poster/flyer for The WIP Meetup,
 a vibrant Web3/metaverse community that meets every Thursday at 3 PM ET.

THIS IS NOT AN EMAIL. THIS IS A POSTER. A FLYER. A BLOCK PARTY INVITATION.
But it MUST be built with EMAIL-COMPATIBLE HTML so it looks IDENTICAL when pasted into Substack.

THIS WEEK'S VISUAL THEME INSPIRATION (internal use only — do NOT display the theme name anywhere):
Design vibe: ${theme.vibe}
PRIMARY COLOR PALETTE:
- Deep background: #0a0612
- Warm pink/magenta: #e84393 — primary brand color
- Coral: #e17055
- Yellow: #fdcb6e
- Green: #55efc4
- Cyan: #00cec9
- Purple: #a29bfe
- Text: #f5f0e8
Theme accent colors (use sparingly): ${theme.accent1}, ${theme.accent2}, ${theme.accent3}

⚠️ CRITICAL — DO NOT display the theme name ("${theme.name}") ANYWHERE in the newsletter. It is purely internal inspiration.

⚠️ CRITICAL — EMAIL/SUBSTACK COMPATIBLE HTML ONLY:
- Do NOT use a <style> block or @keyframes — Substack strips them entirely
- Do NOT use CSS animations, transforms, or transitions — they get removed
- ALL styles MUST be INLINE on each element (style="...")
- Use TABLE-BASED LAYOUT for structure (tables render identically everywhere)
- Use static box-shadows, static borders, static gradients for visual depth
- Background images: use inline style background-image on table cells
- This ensures the newsletter looks EXACTLY the same in preview AND Substack

CRITICAL DESIGN MANDATE — THINK POSTER, NOT EMAIL:
- This should look like it was wheat-pasted to a wall in Brooklyn
- Like a punk rock show flyer you'd rip off a telephone pole and keep
- NOT a corporate newsletter. NOT an email template. NO "Dear reader" energy.
- Every issue should feel like a collector's item that people screenshot and share

VISUAL DEPTH WITHOUT ANIMATIONS (MANDATORY):
1. **GLOWING BORDERS** — Use thick solid borders (3-4px) in accent colors with box-shadow for glow:
   border: 3px solid ${theme.accent1}; box-shadow: 0 0 15px ${theme.accent1}40, 0 0 30px ${theme.accent1}20;

2. **LAYERED DEPTH & SHADOWS** — Every card/section MUST have:
   - Multiple box-shadows for depth: box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 40px ${theme.accent1}15;
   - Inner gradient highlights: background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%), #0f0a1a;
   - Speaker cards should feel glossy and premium

3. **BOLD TYPOGRAPHIC HIERARCHY** — Mandatory sizes:
   - Speaker names: 36-48px, font-weight:900, letter-spacing:-1px, text-shadow with accent color glow
   - Section labels ("THIS WEEK" / "LAST WEEK"): 11-12px, letter-spacing:5px, uppercase, in accent color
   - Bio text: 14-16px, italic, lighter color
   - Body text: 15-16px, line-height:1.6

HEADER — MUST BE EXACTLY THIS (copy-paste these HTML tags verbatim):
- WIP logo: <img src="${WIP_LOGO_GIF_URL}" onerror="this.onerror=null;this.src='${WIP_LOGO_FALLBACK}';" width="80" height="80" style="display:block;margin:0 auto 8px;border-radius:16px;border:3px solid ${theme.accent1};box-shadow:0 0 15px ${theme.accent1}40;" alt="WIP" />
- Below the logo, centered text: "The WIP Meetup" (36-44px, font-weight:900, white with text-shadow glow in accent color)
- Below that: "Every Thursday · 3 PM ET" (14-16px, muted color, margin-bottom:12px)
- Below that: TWO call-to-action buttons side by side:
  1. <a href="https://thewipmeetup.com" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 28px;border:2px solid ${theme.accent1};font-weight:bold;color:#f5f0e8;text-decoration:none;border-radius:4px;box-shadow:0 0 15px ${theme.accent1}40;">Visit Website</a>
  2. <a href="https://discord.gg/XHDcUdm3" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 28px;border:2px dashed #999;font-weight:bold;color:${theme.accent2};text-decoration:none;border-radius:4px;">Join Discord</a>

CRITICAL URL RULES:
- Speaker profile images: Use the EXACT URLs from the [PROFILE IMAGE: ...] tags. Do NOT modify, shorten, or invent avatar URLs.
- Discord: ALWAYS use <a href="https://discord.gg/XHDcUdm3">Join Discord</a>
- YouTube thumbnails: Use https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
- Community links: ALL must be clickable <a> tags with proper href attributes.

${youtube_video_id ? `LAST WEEK'S EVENT VIDEO — include lower in the poster:
- Thumbnail: https://img.youtube.com/vi/${youtube_video_id}/maxresdefault.jpg
- Link: https://youtube.com/watch?v=${youtube_video_id}
- Make the thumbnail a clickable link to the YouTube video
- IMPORTANT: OVERLAY THE VIDEO TITLE on top of the thumbnail.
- Keep the title overlay inside a dark bottom gradient so it remains readable.
- Do NOT place any community background image behind the replay title, recap heading, synopsis, or CTA text.
- Below the replay area, add a separate "▶ Watch the Replay" CTA link` : ""}

⚠️ CRITICAL — SPEAKER BIOS (NOT QUOTES):
- Do NOT use quotes or social media posts for speakers. Instead, display their BIO as a short description/tagline on their card.
- If a BIO is provided, show it as a styled description (14-16px, italic, color:#b0a8c0) below their name and social links.
- If no bio is available, show only their name, PFP, social links, and topic — NO made-up description.
- NEVER fabricate, invent, or paraphrase content for speakers.

SPEAKER CARDS — CRITICAL LAYOUT (SIDE-BY-SIDE, EQUAL WEIGHT):
- ALL speakers MUST appear SIDE BY SIDE in a SINGLE TABLE ROW — never stacked vertically.
- Use a <table width="100%"><tr> with one <td> per speaker, each with equal width:
  - 1 speaker: one <td width="100%" style="max-width:400px;margin:0 auto">
  - 2 speakers: two <td width="50%"> cells
  - 3 speakers: three <td width="33%"> cells
  - 4 speakers: four <td width="25%"> cells
- Each <td> gets: padding:20px, vertical-align:top, background with subtle gradient
- Each card gets: thick accent border, box-shadow glow, inner gradient highlight
- Speaker name at 36-48px with text-shadow glow
- Speaker bio as styled italic description below their name
- NO speaker should appear more prominent than another — equal sizing, equal styling

SPEAKER PROFILE IMAGES — CRITICAL:
- Each speaker with a [PROFILE IMAGE: url] tag MUST have their photo rendered as an <img> tag
- Use the EXACT URL provided — do NOT modify or omit it
- Show as circular images (90-110px) with a 3px border in accent color and box-shadow glow
- If no profile image URL is provided for a speaker, skip the image

SPEAKER SOCIAL LINKS — MUST BE CLICKABLE WITH SPECIFIC COLORS:
- For EVERY speaker, render their social media handles as CLICKABLE <a> links below their name
- Twitter/X links MUST be BLUE: <a href="https://x.com/HANDLE" target="_blank" style="color:#1DA1F2;text-decoration:none;font-weight:bold;">𝕏 @HANDLE</a>
- Farcaster links MUST be PURPLE: <a href="https://warpcast.com/HANDLE" target="_blank" style="color:#8B5CF6;text-decoration:none;font-weight:bold;">🟣 @HANDLE on Farcaster</a>
- Show both if available, each on its own line
- These go directly under each speaker's name in their headliner card

SPEAKER TOPIC — MUST ALWAYS BE DISPLAYED AS STYLED TEXT:
- ALWAYS show the topic with the label prefix "Topic: " in a consistent styled format
- If the topic contains a URL (starts with http), display as: <div style="color:${theme.accent1};font-size:14px;margin-top:8px;">Topic: <a href="TOPIC_URL" target="_blank" style="color:${theme.accent1};text-decoration:underline;">TOPIC_URL</a></div>
- If the topic is plain text, display as: <div style="color:${theme.accent1};font-size:14px;margin-top:8px;">Topic: TOPIC_TEXT</div>
- Show topic below social links, ALWAYS with the same visual format regardless of whether it's a URL or text

${transcriptQuoteNote}
CUSTOM EVENT IMAGES — BACKGROUND TEXTURE:
- These images are from LAST WEEK's event — they capture the community energy
- Use them as background-image on table cells with background-size:cover; background-position:center;
- Apply a dark overlay: background:rgba(10,6,18,0.75) to maintain text readability
- If multiple images provided, use different images for different sections
- Also include at least ONE image as a standalone <img> element so it appears in Substack too
${custom_image_urls && custom_image_urls.length > 0 ? custom_image_urls.map((url, i) => `- Image ${i + 1}: ${url}`).join("\n") : "- (No custom images provided this week)"}

LAST WEEK'S RECAP — TRANSCRIPT SYNOPSIS IS MANDATORY:
- If a transcript is provided below, you MUST write a compelling 3-5 sentence synopsis summarizing what happened
- The synopsis should highlight the most interesting discussion points, surprising moments, and key takeaways
- It should make readers WANT to watch the replay
- Place the synopsis PROMINENTLY in the "Last Week's Recap" section, ABOVE the guest PFPs
- Include a "▶ Watch the Replay" CTA linking to the YouTube video
- If NO transcript is provided, write a general teaser like "Missed last week? Our guests dropped some incredible insights — catch the replay!"

LAYOUT RULES:
- Use TABLE-BASED layout throughout (for email compatibility)
- ALL community links should be styled as individual TICKET STUBS with thick dashed borders and box-shadow
- Max-width: 680px, centered with margin:0 auto
- TIGHT SPACING: Keep padding between sections to 16-24px max
- MOBILE-FRIENDLY: Images use max-width:100%, tables use width:100%

SECTIONS ORDER (mandatory):
1. **HEADER** — WIP logo + "The WIP Meetup" (huge, glowing text-shadow) + "Every Thursday · 3 PM ET" + Website & Discord CTAs.
2. **THIS WEEK'S HEADLINERS** — All speakers in ONE equal-weight TABLE row with glowing-border cells, circular PFP, CLICKABLE social links (Twitter in blue #1DA1F2, Farcaster in purple #8B5CF6), topic (ALWAYS with "Topic:" prefix, linked if URL), and their bio as a styled description.
3. **LAST WEEK'S RECAP** — ${lastWeekSpeakersWithImages.length > 0 ? "Feature last week's guests with their circular PFPs, names as clickable social links, alongside the YouTube replay and a transcript-based synopsis." : "YouTube replay or brief recap."} Use custom event images as visible background-image on this section. MUST include a transcript synopsis if transcript data is available.
4. **TICKET STUBS** — Community links as ticket stubs with thick dashed borders and box-shadow. No header.

Output JSON:
{
  "title": "WIP Meetup - ${meetupDateStr}",
  "subtitle": "one-line FOMO-inducing teaser",
  "body_html": "full poster-style HTML with ALL inline styles, NO style block, TABLE-based layout",
  "body_markdown": "clean readable Markdown version — use proper markdown syntax: # headings, ![alt](src) for images, [text](url) for links, **bold**, *italic*. Do NOT echo the raw prompt format (no [PROFILE IMAGE: ...], no (@handle on X/Twitter, link: ...), no BIO: quotes). Write natural prose with proper markdown links.",
  "recap_summary": "2-sentence punchy recap for card preview"
}
IMPORTANT: The title MUST be exactly "WIP Meetup - ${meetupDateStr}" — do not change the format.
IMPORTANT: Do NOT include any <style> block. ALL styles must be inline.
IMPORTANT: Do NOT display the theme name "${theme.name}" anywhere in the output.`;

  // Build last week's transcript synopsis context
  const lastWeekRecapTranscript = lastWeekTranscript
    ? `\n\n**LAST WEEK'S EVENT TRANSCRIPT** (auto-scraped from YouTube captions for video ${lastWeekVideoId}):
Use this transcript to create a compelling 3-5 sentence synopsis of what happened at last week's event. Extract the most interesting discussion points, surprising moments, and key takeaways. The synopsis should make readers WANT to watch the replay. Include a prominent "▶ Watch the Replay" CTA linking to https://youtube.com/watch?v=${lastWeekVideoId}.

TRANSCRIPT:\n${lastWeekTranscript}`
    : "";

  const lastWeekContext = lastWeekSpeakersWithImages.length > 0
    ? `\n\n**LAST WEEK'S GUESTS (auto-pulled from previous newsletter${lastWeekTitle ? ` — "${lastWeekTitle}"` : ""}):**
${lastWeekSpeakerList}
Feature these guests in the "Last Week's Recap" section with their circular PFPs in a compact horizontal row, names as clickable social links. This is the recap of what happened LAST week — these are NOT this week's headliners.${lastWeekRecapTranscript}

IMPORTANT: If a transcript was provided above, write a brief engaging synopsis (3-5 sentences) summarizing the highlights of last week's discussion. This synopsis should appear in the "Last Week's Recap" section above the guest PFPs. Make it punchy and curiosity-inducing so readers click "Watch the Replay". If NO transcript was provided, write a general teaser like "Missed last week? Our guests dropped some incredible insights — catch the replay!"`
    : "";

  const userPrompt = `Generate this week's WIP Weekly poster using the "${theme.name}" visual theme.
This should look like the illest block party flyer / punk rock show poster anyone has ever seen.
NOT an email. A POSTER.

**THIS THURSDAY'S HEADLINERS:**
${speakerList}
${videoContext}
${transcriptSection}
${customImagesContext}
${lastWeekContext}

Community links (style as "entry points" in the ticket section):
- Discord: https://discord.gg/XHDcUdm3
- Twitter/X: https://twitter.com/theWIPmeetup
- YouTube: https://youtube.com/@thewipmeetup
- Farcaster: https://farcaster.xyz/~/channel/thewipmeetup
- Website: https://thewipmeetup.com`;

  try {
    // Models to try in order — fallback on rate limits
    const models = ["gemini-2.0-flash", "gemini-2.5-flash-lite"];

    const maxAttemptsPerModel = 2;
    let geminiRes: Response | null = null;
    let lastErrorDetail = "AI generation failed";
    let totalAttempts = 0;

    for (const model of models) {
      let modelWorked = false;

      for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt += 1) {
        totalAttempts += 1;
        console.log(`Trying model ${model}, attempt ${attempt}/${maxAttemptsPerModel}`);

        geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] }],
              generationConfig: {
                temperature: 0.8,
                responseMimeType: "application/json",
              },
            }),
          },
        );

        if (geminiRes.ok) {
          modelWorked = true;
          break;
        }

        const errText = await geminiRes.text();
        console.error(`Gemini error (${model}):`, geminiRes.status, errText);

        let detail = "AI generation failed";
        try {
          const parsed = JSON.parse(errText);
          detail = parsed?.error?.message || detail;
        } catch {
          // ignore
        }

        if (geminiRes.status === 429) detail = `Rate limited on ${model} — trying fallback`;
        if (geminiRes.status === 400) detail = "Invalid request to Gemini — check GEMINI_API_KEY";
        if (geminiRes.status === 401) detail = "Invalid GEMINI_API_KEY";

        lastErrorDetail = detail;

        const hardFail = [400, 401, 403].includes(geminiRes.status);
        if (hardFail) {
          return res.status(502).json({ error: detail, retry_attempts: totalAttempts });
        }

        if (geminiRes.status === 429) break;

        const jitterMs = Math.floor(Math.random() * 300);
        const backoffMs = Math.min(8000, 1000 * 2 ** (attempt - 1) + jitterMs);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }

      if (modelWorked) break;
    }

    if (!geminiRes || !geminiRes.ok) {
      return res.status(502).json({
        error: `All models rate-limited. ${lastErrorDetail}`,
        retry_attempts: totalAttempts,
      });
    }

    const geminiData = (await geminiRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return res.status(502).json({ error: "Empty AI response" });

    let generated: {
      title: string;
      subtitle?: string;
      body_html: string;
      body_markdown: string;
      recap_summary?: string;
    };

    try {
      generated = JSON.parse(raw);
    } catch (parseErr) {
      console.error("Gemini returned non-JSON:", raw);
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      return res.status(502).json({ error: `AI returned invalid JSON: ${msg}` });
    }

    // ── POST-PROCESSING: make generated HTML bulletproof ──────────────────

    // 1) Rewrite any direct unavatar.io URLs → our avatar proxy
    generated.body_html = generated.body_html.replace(
      /https:\/\/unavatar\.io\/(farcaster|twitter)\/([a-zA-Z0-9_.%-]+)/g,
      (_m: string, service: string, handle: string) => {
        const key = service === "farcaster" ? "farcaster" : "twitter";
        return `${avatarBase}&${key}=${encodeURIComponent(handle)}`;
      },
    );

    // 2) Rewrite any Warpcast/Twitter profile image URLs the AI may have invented
    generated.body_html = generated.body_html.replace(
      /https:\/\/(?:i\.)?warpcast\.com\/[^\s"'<>]+/gi,
      (match: string) => {
        // Only rewrite if it looks like a PFP URL inside an img src
        if (/\.(jpg|jpeg|png|gif|webp|avif)/i.test(match)) {
          return `${avatarBase}&url=${encodeURIComponent(match)}`;
        }
        return match;
      },
    );

    // 3) Ensure WIP logo uses the real image with inline SVG fallback via onerror
    const logoSvgDataUri = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='16' fill='%230a0612'/%3E%3Crect x='2' y='2' width='76' height='76' rx='14' fill='none' stroke='%23e84393' stroke-width='3'/%3E%3Ctext x='40' y='48' font-family='Arial,sans-serif' font-size='28' font-weight='bold' fill='%23f5f0e8' text-anchor='middle'%3EWIP%3C/text%3E%3C/svg%3E`;
    generated.body_html = generated.body_html.replace(
      /<img\s([^>]*?)(\s*\/?>)/gi,
      (full: string, attrs: string, close: string) => {
        const isLogo = /wip-logo|wip-archive-hub\.lovable|thewipmeetup\.com\/images/i.test(attrs)
          || (/alt=["']WIP["']/i.test(attrs) && /width.*?80|height.*?80/i.test(attrs));
        if (!isLogo) return full;
        // Keep the real logo URL as src, add onerror fallback
        const hasSrc = /src=["']([^"']*)["']/i.exec(attrs);
        const currentSrc = hasSrc?.[1] || "";
        const WIP_GIF = "https://wip-archive-hub.lovable.app/images/wip-logo.gif";
        const realSrc = currentSrc.startsWith("data:") ? WIP_GIF : (currentSrc.includes("wip-logo") ? WIP_GIF : currentSrc || WIP_GIF);
        const cleanAttrs = attrs
          .replace(/src=["'][^"']*["']/gi, `src="${realSrc}"`)
          .replace(/\s*onerror=["'][^"']*["']/gi, "");
        return `<img ${cleanAttrs} onerror="this.onerror=null;this.src='${logoSvgDataUri}';"${close}`;
      },
    );

    // 4) Ensure Discord links are proper <a> tags, not raw text
    //    Replace bare "discord.gg/XHDcUdm3" text that isn't already inside an href
    generated.body_html = generated.body_html.replace(
      /(?<!href=["'](?:https?:\/\/)?)(?<!<a[^>]*>)(?:https?:\/\/)?discord\.gg\/XHDcUdm3(?![^<]*<\/a>)/gi,
      `<a href="https://discord.gg/XHDcUdm3" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;">discord.gg/XHDcUdm3</a>`,
    );

    // 5) Ensure all speaker PFP img tags use our proxy URLs (AI sometimes strips proxy or invents URLs)
    for (const s of speakersWithImages) {
      if (!s.profile_image_url || !s.name) continue;
      // Find img tags near the speaker name that have a non-proxy src
      const nameEscaped = s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // This ensures any avatar img within 500 chars of the speaker name uses the correct proxy URL
      generated.body_html = generated.body_html.replace(
        new RegExp(`(<img\\s[^>]*?src=["'])([^"']*?)(?=["'][^>]*?(?:${nameEscaped}|alt=["'][^"']*${nameEscaped}))`, "gi"),
        (_full: string, prefix: string, src: string) => {
          // If already proxied, keep it
          if (src.includes("/api/newsletter?action=avatar")) return prefix + src;
          // If it's a known avatar URL, proxy it
          if (/unavatar|warpcast|pbs\.twimg|imagedelivery/i.test(src)) {
            return prefix + `${avatarBase}&url=${encodeURIComponent(src)}`;
          }
          return prefix + src;
        },
      )
    }

    const id = `wip-weekly-${Date.now()}`;
    const now = new Date().toISOString();

    const issue = {
      id,
      title: generated.title,
      subtitle: generated.subtitle || "",
      body_html: generated.body_html,
      body_markdown: generated.body_markdown,
      speakers: speakersWithImages,
      recap_summary: generated.recap_summary || "",
      youtube_video_id: youtube_video_id || "",
      cover_image: youtube_video_id
        ? `https://img.youtube.com/vi/${youtube_video_id}/maxresdefault.jpg`
        : "",
      status: "draft" as const,
      created_at: now,
      week_of: now,
    };

    try {
      const redis = getRedis();
      await redis.set(`newsletter:${id}`, JSON.stringify(issue));
      const index = (await redis.get<string[]>("newsletter:index")) || [];
      index.unshift(id);
      await redis.set("newsletter:index", index);
    } catch (kvErr) {
      console.warn("KV save skipped (not configured?):", kvErr);
    }

    return res.status(200).json(issue);
  } catch (err) {
    console.error("newsletter-generate error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg || "Internal server error" });
  }
}
