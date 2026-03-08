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

  const { speakers, transcript, youtube_video_id } = req.body as {
    speakers?: Speaker[];
    transcript?: string;
    youtube_video_id?: string;
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

  const speakerList = speakers
    .map(
      (s) =>
        `- ${s.name}${s.twitter ? ` (@${s.twitter} on X/Twitter)` : ""}${s.farcaster ? ` (@${s.farcaster} on Farcaster)` : ""}${s.topic ? ` — Topic: ${s.topic}` : ""}${s.bio ? ` — Bio: ${s.bio}` : ""}`
    )
    .join("\n");

  const transcriptSection = effectiveTranscript
    ? `\n\nHere is a transcript/notes from last week's event. EXTRACT 2-3 of the best, most quotable moments and feature them prominently as pull-quotes with speaker attribution:\n${effectiveTranscript}`
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
Color palette: primary=${theme.accent1}, secondary=${theme.accent2}, highlight=${theme.accent3}
Background: dark (#0a0612)

CRITICAL DESIGN MANDATE — THINK POSTER, NOT EMAIL:
- This should look like it was wheat-pasted to a wall in Brooklyn
- Like a punk rock show flyer you'd rip off a telephone pole and keep
- Like the dopest block party invitation that makes you cancel all other plans
- NOT a corporate newsletter. NOT an email template. NO "Dear reader" energy.
- Every issue should feel like a collector's item that people screenshot and share

WIP LOGO — MUST INCLUDE:
- URL: ${WIP_LOGO_URL}
- Place it prominently at the top as the "promoter logo" — like a record label or venue logo on a concert poster
- Style it large (120-160px), centered, with a glow effect matching the theme

${youtube_video_id ? `LAST WEEK'S EVENT VIDEO — MUST INCLUDE AS CLICKABLE ELEMENT:
- Thumbnail: https://img.youtube.com/vi/${youtube_video_id}/maxresdefault.jpg
- Link: https://youtube.com/watch?v=${youtube_video_id}
- Make this a prominent, clickable image with a "▶ WATCH THE REPLAY" overlay
- Style it like a film still or concert photo — with border effects matching the theme
- Add a glow/border treatment so it pops` : ""}

POSTER DESIGN PRINCIPLES:
- MASSIVE typography: Headers should be 36-48px, uppercase, with heavy letter-spacing (0.2-0.4em) and text-shadow
- The speakers are HEADLINERS — their names should be the biggest text on the poster after the title
- Use CSS transforms (rotate slight angles -1deg to 2deg) on elements for that hand-placed poster feel
- Layer elements: overlapping borders, stacked sections, asymmetric padding
- Use thick borders (3-4px) in accent colors, not subtle 1px lines
- Add "torn edge" or "stamp" effects using creative border-radius and box-shadow combos
- Date/time should look like it's STAMPED on — rotated, bold, with a border box around it
- Pull-quotes from the transcript should be HUGE, in accent colors, with quotation marks as decorative elements

${effectiveTranscript ? `PULL-QUOTES — CRITICAL:
- Extract 2-3 of the most interesting, funny, or insightful quotes from the transcript
- Display them as massive pull-quotes (24-32px font) with decorative quotation marks
- Style them like graffiti tags or highlighted text with background accent colors
- Attribute each quote to the speaker` : ""}

HTML RULES:
- All styles INLINE (this will also be used in email)
- Background: #0a0612, text: #f5f0e8
- Use the theme colors (${theme.accent1}, ${theme.accent2}, ${theme.accent3}) liberally
- Box-shadows for glow: box-shadow: 0 0 30px ${theme.accent1}60, 0 0 60px ${theme.accent1}20
- Max-width: 680px, centered, but content should feel like it's BURSTING out of the frame
- Use background gradients on sections for depth
- NO bland email patterns — no "Hi there!" or "Click here to read more"

SECTIONS (think of these as ZONES of the poster):
1. **🔥 HEADER BANNER** — WIP logo + issue title styled like a concert poster header. MASSIVE. BOLD. The title should feel like an event name.
2. **🎪 THE LINEUP** — Speakers as headliners. Big names in accent colors, topics as "set descriptions", socials as ways to connect. Style like a festival lineup poster.
3. **📼 LAST WEEK'S REPLAY** — ${youtube_video_id ? "Clickable YouTube thumbnail with watch overlay." : "Brief recap."} If transcript quotes are available, feature them prominently here as pull-quotes.
4. **🎫 THE DETAILS** — Date, time, links — styled like a ticket stub or wristband. Discord, Twitter, YouTube links as "entry points". Make it feel like tearing off a ticket.

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
