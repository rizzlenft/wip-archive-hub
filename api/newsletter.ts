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
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY not configured" });

  const { speakers, transcript, youtube_video_id } = req.body as {
    speakers?: Speaker[];
    transcript?: string;
    youtube_video_id?: string;
  };

  if (!speakers || speakers.length === 0) {
    return res.status(400).json({ error: "At least one speaker is required" });
  }

  let videoContext = "";
  if (youtube_video_id) {
    videoContext = `\nThe latest WIP Meetup recording: https://youtube.com/watch?v=${youtube_video_id}`;
  }

  const speakerList = speakers
    .map(
      (s) =>
        `- ${s.name}${s.twitter ? ` (@${s.twitter} on X/Twitter)` : ""}${s.farcaster ? ` (@${s.farcaster} on Farcaster)` : ""}${s.topic ? ` — Topic: ${s.topic}` : ""}${s.bio ? ` — Bio: ${s.bio}` : ""}`
    )
    .join("\n");

  const transcriptSection = transcript
    ? `\n\nHere is a transcript/notes from last week's event to use for the recap:\n${transcript}`
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

  const systemPrompt = `You are the creative director of "The WIP Weekly" — the weekly newsletter for The WIP Meetup,
a vibrant Web3/metaverse community that meets every Thursday at 3 PM ET.

THIS WEEK'S VISUAL THEME: "${theme.name}"
Design vibe: ${theme.vibe}
Color palette: primary=${theme.accent1}, secondary=${theme.accent2}, highlight=${theme.accent3}
Background: dark (#0a0612)

CRITICAL DESIGN MANDATE: This newsletter must look like an INVITATION TO THE COOLEST EVENT EVER.
Think: indie concert flyer meets block party invitation meets underground art show announcement.
Every issue should feel like a collector's item that people screenshot and share.

Your design principles:
- BOLD typography: Use large, attention-grabbing headers with CSS text-transform, letter-spacing, and text-shadow
- VISUAL hierarchy: The speakers are the HEADLINERS — treat them like concert lineup acts
- ENERGY: Use emoji strategically as visual punctuation 🔥⚡🎤🌐✨ but don't overdo it
- INTERACTIVE feel: CSS hover states, gradient borders, glowing accents
- SECTIONS should feel like distinct "zones" of a party/venue
- Speaker cards should look like artist lineup cards with their socials as "tickets to connect"
- Include decorative CSS elements: borders, dividers, background patterns using CSS gradients
- The date/time should feel like an EVENT STAMP — bold, unmissable, like a concert ticket

HTML STYLING RULES:
- All styles must be INLINE (email compatible)
- Background: #0a0612, text: #f5f0e8
- Use the theme colors (${theme.accent1}, ${theme.accent2}, ${theme.accent3}) throughout
- Add CSS box-shadows for glow effects: box-shadow: 0 0 20px ${theme.accent1}40
- Use border-radius, padding, and background gradients to create card-like sections
- Speaker names should be LARGE (24px+) and in the primary accent color
- Add a "header banner" section that looks like a concert/party poster title
- Include decorative separators between sections (styled <hr> or div borders)
- The overall email should be max-width 600px, centered

Generate a newsletter with these sections:
1. **🎪 THE LINEUP** — Present upcoming speakers like concert headliners. Big names, their topics as "set descriptions", socials as connection points. This should be the HERO section.
2. **🔥 LAST WEEK'S SET** — Recap styled like a concert review / after-party report. Engaging, vivid, makes you feel like you missed out.
3. **🌐 COMMUNITY SPOTLIGHT** — A brief community highlight styled like a "local artist feature"
4. **🎫 GET YOUR TICKET** — Date/time/links styled like an actual event ticket or wristband. Discord, Twitter, YouTube links.

Output JSON with these fields:
{
  "title": "catchy headline that sounds like an event name (e.g. 'WIP SESSIONS VOL.47: The Future Builders')",
  "subtitle": "one-line teaser that creates FOMO",
  "body_html": "full HTML newsletter with ALL inline styles — must look incredible",
  "body_markdown": "clean Markdown version",
  "recap_summary": "2-sentence recap for card preview — punchy and exciting"
}`;

  const userPrompt = `Generate this week's WIP Weekly newsletter using the "${theme.name}" visual theme.
Make it feel like the most exclusive, exciting invitation anyone has ever received.

**THIS THURSDAY'S HEADLINERS:**
${speakerList}
${videoContext}
${transcriptSection}

Community links (include in the "ticket" section):
- Discord: https://discord.gg/XHDcUdm3
- Twitter/X: https://twitter.com/theWIPmeetup
- YouTube: https://youtube.com/@thewipmeetup
- Farcaster: https://farcaster.xyz/~/channel/thewipmeetup
- Website: https://thewipmeetup.com`;

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      return res.status(502).json({ error: "AI generation failed" });
    }

    const completion = (await openaiRes.json()) as {
      choices: { message: { content: string } }[];
    };
    const raw = completion.choices?.[0]?.message?.content;
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
