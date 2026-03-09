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

    if (req.method === "GET") return handleList(req, res);
    if (req.method === "POST") {
      const action = (req.query.action as string) || "save";
      if (action === "generate") return handleGenerate(req, res);
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

// ─── GENERATE ────────────────────────────────────────────────────────────────

async function handleGenerate(req: VercelRequest, res: VercelResponse) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: "GEMINI_API_KEY not configured — add it in Vercel env vars (get one free at aistudio.google.com)" });

  const { speakers, transcript, youtube_video_id, custom_image_urls } = req.body as {
    speakers?: Speaker[];
    transcript?: string;
    youtube_video_id?: string;
    custom_image_urls?: string[];
  };

  if (!speakers || speakers.length === 0) {
    return res.status(400).json({ error: "At least one speaker is required" });
  }

  // ── Auto-fetch YouTube transcript if available ──────────────────────────
  let autoTranscript = "";
  if (youtube_video_id && !transcript) {
    try {
      // Try fetching auto-generated captions via a public proxy
      const captionRes = await fetch(
        `https://www.youtube.com/watch?v=${youtube_video_id}`
      );
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

  // Resolve speaker profile images via unavatar.io (Farcaster preferred)
  const speakersWithImages = speakers.map((s) => {
    if (s.profile_image_url) return s;
    // unavatar.io will resolve Farcaster, Twitter, etc. for free
    if (s.farcaster) {
      return { ...s, profile_image_url: `https://unavatar.io/farcaster/${s.farcaster.replace(/^@/, "")}` };
    }
    if (s.twitter) {
      return { ...s, profile_image_url: `https://unavatar.io/twitter/${s.twitter.replace(/^@/, "")}` };
    }
    return s;
  });

  const speakerList = speakersWithImages
    .map(
      (s) =>
        `- ${s.name}${s.profile_image_url ? ` [PROFILE IMAGE: ${s.profile_image_url}]` : ""}${s.twitter ? ` (@${s.twitter} on X/Twitter)` : ""}${s.farcaster ? ` (@${s.farcaster} on Farcaster)` : ""}${s.topic ? ` — Topic: ${s.topic}` : ""}${s.bio ? ` — Bio: ${s.bio}` : ""}`
    )
    .join("\n");

  // Build custom images context
  const customImagesContext = custom_image_urls && custom_image_urls.length > 0
    ? `\n\nCUSTOM EVENT IMAGES FROM LAST WEEK (these are community photos from LAST WEEK's event — NOT this week's speakers):
${custom_image_urls.map((url, i) => `- Image ${i + 1}: ${url}`).join("\n")}
These are general community vibes — scatter them naturally through the poster at slight angles. Do NOT associate them with this week's speakers.`
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
    { name: "Block Party", vibe: "street art, bold graffiti typography, neon spray-paint accents, warehouse party energy, brick texture backgrounds", accent1: "#ff2d55", accent2: "#ffcc00", accent3: "#00ff88" },
    { name: "Indie Concert Poster", vibe: "vintage gig poster, torn paper edges, halftone dots, bold woodblock type, underground music venue energy", accent1: "#ff6b35", accent2: "#f7c948", accent3: "#7b61ff" },
    { name: "Cyberpunk Rave", vibe: "glitch art, scan lines, terminal green on black, futuristic HUD elements, matrix-style rain effects", accent1: "#00ffcc", accent2: "#ff00ff", accent3: "#00ccff" },
    { name: "Zine Culture", vibe: "cut-and-paste collage, xerox aesthetic, punk DIY energy, handwritten annotations, photocopied textures", accent1: "#ff4081", accent2: "#e0e0e0", accent3: "#ffeb3b" },
    { name: "Festival Wristband", vibe: "music festival lineup poster, sunset gradient vibes, psychedelic swirls, Coachella meets Burning Man energy", accent1: "#ff6ec7", accent2: "#7b68ee", accent3: "#ffa500" },
    { name: "Gallery Opening", vibe: "minimalist art gallery invite, stark contrasts, elegant sans-serif, single bold accent color, sophisticated rebel energy", accent1: "#ff3366", accent2: "#ffffff", accent3: "#1a1a2e" },
    { name: "Retro Arcade", vibe: "pixel art borders, 8-bit style decorations, CRT screen glow, neon cabinet colors, press-start energy", accent1: "#39ff14", accent2: "#ff073a", accent3: "#0ff" },
  ];
  const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const theme = visualThemes[weekIndex % visualThemes.length];

  const WIP_LOGO_URL = "https://thewipmeetup.com/images/wip-logo-static.png";

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

HEADER — MUST BE EXACTLY THIS:
- WIP logo: <img src="${WIP_LOGO_URL}" style="width:80px;height:80px;display:block;margin:0 auto 12px;" alt="WIP" />
- Below the logo, centered text: "The WIP Meetup" (32-40px, bold, white with subtle glow)
- Below that: "Every Thursday · 3 PM ET" (16-18px, muted color)
- Below that: a small Discord link styled as a ticket stub: "Join → discord.gg/XHDcUdm3"
- That's it for the header. Clean. No "VOL. 50" or "SESSIONS" — just the meetup name and next event info.

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

SPEAKER PROFILE IMAGES — CRITICAL:
- Each speaker with a [PROFILE IMAGE: url] tag MUST have their photo rendered as an <img> tag
- Use the EXACT URL provided — do NOT modify or omit it
- Show as circular images (80-100px): style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid ${theme.accent1}"
- Place next to their name AND next to any quotes attributed to them
- If no profile image URL is provided for a speaker, skip the image — do NOT use a placeholder

${effectiveTranscript ? `PULL-QUOTES — PLACE THESE RIGHT AFTER THE HEADER, WITH THE SPEAKERS:
- Extract 2-3 of the most INSIGHTFUL, mind-blowing, or hilarious quotes from the transcript
- These go at the TOP of the poster, right under the header, paired with the speaker who said them
- Display as MASSIVE pull-quotes (28-36px font) with oversized decorative quotation marks (❝❞ at 60-80px)
- Each quote gets its own visual treatment — rotated, bordered, glowing
- Show the speaker's circular PFP next to their quote attribution
- These quotes should make the reader think "damn, I need to be at the next event"` : ""}

CUSTOM EVENT IMAGES — IMPORTANT CONTEXT:
- These images are from LAST WEEK'S event — they show the community, NOT this week's speakers
- Do NOT caption them with this week's speaker names or associate them with specific speakers
- Place them naturally throughout the poster as scattered photos — slight rotation, tape/pin aesthetic
- NO section header like "CANDID SHOTS" — just place them organically between sections
${custom_image_urls && custom_image_urls.length > 0 ? custom_image_urls.map((url, i) => `- Image ${i + 1}: ${url}`).join("\n") : "- (No custom images provided this week)"}

LAYOUT RULES:
- Do NOT use a "CANDID SHOTS" header or any header for event images
- Do NOT include a "THE DETAILS" header
- ALL community links should be styled as individual CONCERT TICKET STUBS — rectangular with dashed perforated borders, platform name as bold text, slightly rotated

HTML RULES:
- All styles INLINE (this will also be used in email)
- Max-width: 680px, centered
- Use background gradients on sections for depth

SECTIONS ORDER (this order is mandatory):
1. **HEADER** — WIP logo + "The WIP Meetup" + "Every Thursday · 3 PM ET" + Discord link. Clean and simple.
2. **THIS WEEK'S HEADLINERS + QUOTES** — Speakers with their PROFILE PHOTOS (circular, glowing borders) displayed prominently ALONGSIDE their best quotes from last week's transcript. Names huge, quotes huge. This is the main attraction.
3. **LAST WEEK'S REPLAY** — ${youtube_video_id ? "YouTube thumbnail with tiny '▶ WATCH' badge." : "Brief recap."} Event photos scattered around this section naturally.
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
    const models = [
      "gemini-2.0-flash",
      "gemini-2.5-flash-lite",
    ];

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
              contents: [
                { role: "user", parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] },
              ],
              generationConfig: {
                temperature: 0.8,
                responseMimeType: "application/json",
              },
            }),
          }
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
          // Use default detail
        }

        if (geminiRes.status === 429) {
          detail = `Rate limited on ${model} — trying fallback`;
        }
        if (geminiRes.status === 400) detail = "Invalid request to Gemini — check GEMINI_API_KEY";
        if (geminiRes.status === 401) detail = "Invalid GEMINI_API_KEY";

        lastErrorDetail = detail;

        // Non-retryable errors (except 429 which we handle by model fallback)
        const hardFail = [400, 401, 403].includes(geminiRes.status);
        if (hardFail) {
          return res.status(502).json({ error: detail, retry_attempts: totalAttempts });
        }

        // For 429, break to next model immediately
        if (geminiRes.status === 429) break;

        // For 5xx, retry with backoff
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

    if (!geminiRes || !geminiRes.ok) {
      return res.status(502).json({ error: lastErrorDetail });
    }

    const geminiData = (await geminiRes.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return res.status(502).json({ error: "Empty AI response" });

    const generated = JSON.parse(raw) as {
      title: string;
      subtitle?: string;
      body_html: string;
      body_markdown: string;
      recap_summary?: string;
    };

    const id = `wip-weekly-${Date.now()}`;
    const now = new Date().toISOString();

    const issue = {
      id,
      title: generated.title,
      subtitle: generated.subtitle || "",
      body_html: generated.body_html,
      body_markdown: generated.body_markdown,
      speakers,
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
    return res.status(500).json({ error: "Internal server error" });
  }
}
