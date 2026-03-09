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

  // ── Auto-fetch last week's speakers from the most recent published newsletter ──
  let lastWeekSpeakers: Speaker[] = [];
  let lastWeekTitle = "";
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
        break; // most recent published
      }
    }
  } catch (err) {
    console.warn("Failed to fetch previous newsletter speakers:", err);
  }

  // ── Auto-fetch YouTube transcript if available ──────────────────────────
  let autoTranscript = "";
  if (youtube_video_id && !transcript) {
    try {
      // Try fetching auto-generated captions via a public proxy
      const captionRes = await fetch(`https://www.youtube.com/watch?v=${youtube_video_id}`);
      if (captionRes.ok) {
        const html = await captionRes.text();
        // Extract caption track URL from the page
        const captionMatch = html.match(/"captionTracks":\[.*?"baseUrl":"(.*?)"/);
        if (captionMatch) {
          const captionUrl = captionMatch[1].replace(/\\u0026/g, "&");
          const subRes = await fetch(captionUrl);
          if (subRes.ok) {
            const subXml = await subRes.text();
            // Strip XML tags to get plain text
            autoTranscript = subXml
              .replace(/<[^>]+>/g, " ")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&#39;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 4000); // Limit to avoid token overflow
            console.log(`Auto-fetched transcript: ${autoTranscript.length} chars`);
          }
        }
      }
    } catch (err) {
      console.warn("Failed to auto-fetch YouTube transcript:", err);
    }
  }

  const effectiveTranscript = transcript || autoTranscript;

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

  const speakerList = speakersWithImages
    .map((s) => {
      const tw = normalizeTwitterHandle(s.twitter);
      const fc = normalizeFarcasterHandle(s.farcaster);
      return `- ${s.name}${s.profile_image_url ? ` [PROFILE IMAGE: ${s.profile_image_url}]` : ""}${tw ? ` (@${tw} on X/Twitter, link: https://x.com/${tw})` : ""}${fc ? ` (@${fc} on Farcaster, link: https://farcaster.xyz/${fc})` : ""}${s.topic ? ` — Topic: ${s.topic}` : ""}${s.bio ? ` — Bio: ${s.bio}` : ""}`;
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

  // Build custom images context
  const customImagesContext =
    custom_image_urls && custom_image_urls.length > 0
      ? `\n\nCUSTOM EVENT IMAGES FROM LAST WEEK (these are community photos from LAST WEEK's event — NOT this week's speakers):
${custom_image_urls.map((url, i) => `- Image ${i + 1}: ${url}`).join("\n")}
Use these as atmospheric background layers (opacity ~0.20-0.30, slight blur, behind content). They should be VISIBLE and add energy. Do NOT feature them as big foreground photos and do NOT associate them with a specific speaker.`
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

  // Inline SVG fallback for the WIP logo (simple "WIP" text badge) encoded as a data URI
  const WIP_LOGO_FALLBACK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='16' fill='%230a0612'/%3E%3Crect x='2' y='2' width='76' height='76' rx='14' fill='none' stroke='%23e84393' stroke-width='3'/%3E%3Ctext x='40' y='48' font-family='Arial,sans-serif' font-size='28' font-weight='bold' fill='%23f5f0e8' text-anchor='middle'%3EWIP%3C/text%3E%3C/svg%3E`;

  const systemPrompt = `You are the creative director of "The WIP Weekly" — the weekly poster/flyer for The WIP Meetup,
 a vibrant Web3/metaverse community that meets every Thursday at 3 PM ET.

⚠️ THIS IS NOT AN EMAIL. THIS IS A POSTER. A FLYER. A BLOCK PARTY INVITATION. ⚠️

THIS WEEK'S VISUAL THEME: "${theme.name}"
Design vibe: ${theme.vibe}
PRIMARY COLOR PALETTE — Use these as the core colors, inspired by The WIP Meetup brand:
- Deep background: #0a0612
- Warm pink/magenta: hsl(330, 85%, 65%) — primary brand color
- Coral: hsl(15, 90%, 65%)
- Yellow: hsl(50, 95%, 60%)
- Green: hsl(150, 75%, 55%)
- Cyan: hsl(175, 80%, 55%)
- Purple: hsl(270, 70%, 60%)
- Text: #f5f0e8
Theme accent colors (use sparingly as highlights): ${theme.accent1}, ${theme.accent2}, ${theme.accent3}

CRITICAL DESIGN MANDATE — THINK POSTER, NOT EMAIL:
- This should look like it was wheat-pasted to a wall in Brooklyn
- Like a punk rock show flyer you'd rip off a telephone pole and keep
- NOT a corporate newsletter. NOT an email template. NO "Dear reader" energy.
- Every issue should feel like a collector's item that people screenshot and share

HEADER — MUST BE EXACTLY THIS (copy-paste these HTML tags verbatim):
- WIP logo: <img src="${WIP_LOGO_URL}" onerror="this.onerror=null;this.src='${WIP_LOGO_FALLBACK}';" style="width:80px;height:80px;display:block;margin:0 auto 8px;border-radius:16px;border:3px solid ${theme.accent1};" alt="WIP" />
- Below the logo, centered text: "The WIP Meetup" (32-40px, bold, white with subtle glow)
- Below that: "Every Thursday · 3 PM ET" (14-16px, muted color, margin-bottom:12px)
- Below that: TWO call-to-action buttons side by side in a flex row (gap:12px, centered):
  1. <a href="https://thewipmeetup.com" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 24px;border:2px solid ${theme.accent1};font-weight:bold;color:#f5f0e8;text-decoration:none;border-radius:4px;">Visit Website</a>
  2. <a href="https://discord.gg/XHDcUdm3" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 24px;border:2px dashed #999;font-weight:bold;color:${theme.accent2};text-decoration:none;border-radius:4px;">Join Discord</a>
- That's it for the header. Clean. No "VOL. 50" or "SESSIONS" — just the meetup name, next event info, and two CTAs.

⚠️ CRITICAL URL RULES — VIOLATING THESE WILL BREAK THE POSTER:
- Speaker profile images: Use the EXACT URLs from the [PROFILE IMAGE: ...] tags. Do NOT modify, shorten, or invent avatar URLs.
- Discord: ALWAYS use <a href="https://discord.gg/XHDcUdm3">Join Discord</a> — NEVER show the raw URL as visible text.
- YouTube thumbnails: Use https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg — NEVER invent or modify.
- Community links: ALL must be clickable <a> tags with proper href attributes.

${youtube_video_id ? `LAST WEEK'S EVENT VIDEO — include lower in the poster:
- Thumbnail: https://img.youtube.com/vi/${youtube_video_id}/maxresdefault.jpg
- Link: https://youtube.com/watch?v=${youtube_video_id}
- Make this a clickable image with ONLY a tiny "▶ WATCH" pill badge (12-14px) in the bottom-right corner
- Do NOT make a giant overlay or banner. The thumbnail speaks for itself.` : ""}

POSTER DESIGN PRINCIPLES:
- MASSIVE typography for speaker names and quotes (36-48px), moderate for everything else
- The speakers are HEADLINERS — their names and quotes go RIGHT AFTER the header, at the very top
- Use CSS transforms (rotate slight angles -1deg to 2deg) on elements for that hand-placed poster feel
- Layer elements: overlapping borders, stacked sections, asymmetric padding
- Use thick borders (3-4px) in accent colors, not subtle 1px lines
- Pull-quotes from the transcript should be HUGE, in accent colors, with decorative quotation marks

HEADLINERS LAYOUT — CRITICAL (NO PRIORITY):
- Render ALL speakers in ONE equal-weight grid right after the header (do NOT stack full-width speaker sections)
- Use a flex-wrap grid container like: style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;align-items:stretch;"
- Each speaker block should be the SAME visual weight: style="flex:1 1 260px;max-width:320px;min-width:240px;" so 2–4 speakers can sit side-by-side
- Put each speaker’s best quote inside their own block so nobody is visually prioritized

SPEAKER PROFILE IMAGES — CRITICAL:
- Each speaker with a [PROFILE IMAGE: url] tag MUST have their photo rendered as an <img> tag
- Use the EXACT URL provided — do NOT modify or omit it
- Show as circular images (80-100px): style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid ${theme.accent1}"
- Place next to their name AND next to any quotes attributed to them
- If no profile image URL is provided for a speaker, skip the image — do NOT use a placeholder

SPEAKER SOCIAL LINKS — MUST INCLUDE:
- For EVERY speaker, render their social media handles as clickable links below their name
- Twitter/X: render as <a href="https://x.com/HANDLE" target="_blank" style="color:${theme.accent2};text-decoration:none;font-size:13px;">@HANDLE</a> with an "𝕏" or "✕" prefix
- Farcaster: render as <a href="https://farcaster.xyz/HANDLE" target="_blank" style="color:${theme.accent3};text-decoration:none;font-size:13px;">@HANDLE</a> with a "🟣" prefix
- Show both if available, separated by a " · " divider
- These go directly under each speaker's name in their headliner card

${effectiveTranscript ? `PULL-QUOTES — PLACE THESE RIGHT AFTER THE HEADER, WITH THE SPEAKERS:
- Extract 2-3 of the most INSIGHTFUL, mind-blowing, or hilarious quotes from the transcript
- These go at the TOP of the poster, right under the header, paired with the speaker who said them
- Display as MASSIVE pull-quotes (28-36px font) with oversized decorative quotation marks (❝❞ at 60-80px)
- Each quote gets its own visual treatment — rotated, bordered, glowing
- Show the speaker's circular PFP next to their quote attribution
- These quotes should make the reader think "damn, I need to be at the next event"` : ""}

CUSTOM EVENT IMAGES — BACKGROUND ONLY:
- These images are from LAST WEEK'S event — they show the community, NOT this week's speakers
- Do NOT caption them with this week's speaker names or associate them with specific speakers
- Use them as atmospheric background layers: opacity ~0.20–0.30, slight blur (1–2px), position behind content (z-index:-1 inside a relative wrapper)
- They should be VISIBLE enough to give texture and energy but not compete with text/speaker content
- Do NOT feature them as big foreground photos, and NO section header like "CANDID SHOTS"
${custom_image_urls && custom_image_urls.length > 0 ? custom_image_urls.map((url, i) => `- Image ${i + 1}: ${url}`).join("\n") : "- (No custom images provided this week)"}

LAYOUT RULES:
- Do NOT use a "CANDID SHOTS" header or any header for event images
- Do NOT include a "THE DETAILS" header
- ALL community links should be styled as individual CONCERT TICKET STUBS — rectangular with dashed perforated borders, platform name as bold text, slightly rotated

HTML RULES:
- All styles INLINE (this will also be used in email)
- Max-width: 680px, centered
- Use background gradients on sections for depth
- TIGHT SPACING: Keep padding between sections to 16-24px max. No huge gaps. The poster should feel dense and packed with energy.
- MOBILE-FIRST: All content must look great on 320px-wide screens. Use max-width:100% on images, flex-wrap on grids, and avoid fixed pixel widths over 300px. Speaker grid items should stack to full-width on narrow screens (min-width:240px with flex:1 1 100%).

SECTIONS ORDER (this order is mandatory):
1. **HEADER** — WIP logo + "The WIP Meetup" + "Every Thursday · 3 PM ET" + Website & Discord CTAs.
2. **THIS WEEK'S HEADLINERS + QUOTES** — All speakers in ONE equal-weight grid with circular PFP, clickable social links, and their best quote.
3. **LAST WEEK'S RECAP** — ${lastWeekSpeakersWithImages.length > 0 ? `Feature last week's guests with their circular PFPs in a compact row, names as clickable social links, alongside the YouTube replay thumbnail.` : `${youtube_video_id ? "YouTube thumbnail with tiny '▶ WATCH' badge." : "Brief recap."}`}${youtube_video_id ? ` Include YouTube thumbnail with tiny "▶ WATCH" badge.` : ""} Event images appear as atmospheric background texture.
4. **TICKET STUBS** — Community links as torn concert ticket stubs. No header.

Output JSON:
{
  "title": "event-style name (e.g. 'WIP SESSIONS VOL.47: THE FUTURE BUILDERS')",
  "subtitle": "one-line FOMO-inducing teaser",
  "body_html": "full poster-style HTML with ALL inline styles",
  "body_markdown": "clean Markdown version with the same energy",
  "recap_summary": "2-sentence punchy recap for card preview"
}`;

  const userPrompt = `Generate this week's WIP Weekly poster using the "${theme.name}" visual theme.
This should look like the illest block party flyer / punk rock show poster anyone has ever seen.
NOT an email. A POSTER.

**THIS THURSDAY'S HEADLINERS:**
${speakerList}
${videoContext}
${transcriptSection}
${customImagesContext}

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
        const realSrc = currentSrc.startsWith("data:") ? WIP_LOGO_URL : currentSrc || WIP_LOGO_URL;
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
