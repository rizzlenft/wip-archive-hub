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
    ? `\n\nCUSTOM EVENT IMAGES (MUST incorporate these throughout the poster as event photography):
${custom_image_urls.map((url, i) => `- Image ${i + 1}: ${url} — style with border treatments, slight rotation, and glow matching theme`).join("\n")}
Place these as "event photos" throughout the poster — like candid shots pinned to a corkboard or taped to a wall.`
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

CRITICAL LAYOUT RULES:
- The "WATCH THE REPLAY" button/overlay must be SMALL and subtle — a compact pill/badge (14-16px font, inline) overlaid on the thumbnail corner. NOT a giant banner. The video thumbnail itself should be the star, the button is just a small "▶ WATCH" tag.
- Do NOT use a "CANDID SHOTS" header or any header for event images. Just place them naturally throughout the poster as if they were taped/pinned to the poster at slight angles — no announcement, no section header, just vibes.
- Do NOT include a "THE DETAILS" header. Instead, make the date/time/links section look like ACTUAL CONCERT TICKET STUBS — with perforated edges (dashed borders), a tear-off stub feel, each link styled as its own mini ticket with the platform name as the headliner. Use a ticket-stub layout: left side has the info, right side has a "tear here" dashed line.
- ALL community links (Discord, X, YouTube, Farcaster, Web) should be styled as individual torn ticket stubs — slightly rotated, with dashed perforated borders, themed colors, and a raw punk aesthetic. NOT flat buttons.

${effectiveTranscript ? `PULL-QUOTES — THIS IS THE MOST IMPORTANT SECTION:
- Extract 2-3 of the most INSIGHTFUL, mind-blowing, or hilarious quotes from the transcript
- These quotes should make the reader think "damn, I need to be at the next event"
- Display them as MASSIVE pull-quotes (28-36px font) with oversized decorative quotation marks (❝❞ or giant " marks at 60-80px)
- Style them like graffiti tags or highlighted text with background accent colors
- Each quote gets its own visual treatment — rotated, bordered, glowing
- Attribute each quote to the speaker with their name styled in accent color
- If a speaker has a profile image, show a small circular avatar next to their quote attribution` : ""}

HTML RULES:
- All styles INLINE (this will also be used in email)
- Background: #0a0612, text: #f5f0e8
- Use the theme colors (${theme.accent1}, ${theme.accent2}, ${theme.accent3}) liberally
- Box-shadows for glow: box-shadow: 0 0 30px ${theme.accent1}60, 0 0 60px ${theme.accent1}20
- Max-width: 680px, centered, but content should feel like it's BURSTING out of the frame
- Use background gradients on sections for depth
- NO bland email patterns — no "Hi there!" or "Click here to read more"

SPEAKER PROFILE IMAGES — MUST INCLUDE:
- Each speaker with a [PROFILE IMAGE: url] MUST have their photo displayed
- Show as circular images (80-100px) with thick accent-colored borders and glow effects
- Place next to their name in the lineup section, and next to any quotes attributed to them
- Style like VIP badges or artist photos on a concert poster

SECTIONS (think of these as ZONES of the poster):
1. **🔥 HEADER BANNER** — WIP logo + issue title styled like a concert poster header. MASSIVE. BOLD. The title should feel like an event name.
2. **🎪 THE LINEUP** — Speakers as headliners with their PROFILE PHOTOS displayed prominently. Big names in accent colors, circular PFPs with glow borders, topics as "set descriptions", socials as ways to connect. Style like a festival lineup poster.
3. **📼 LAST WEEK'S REPLAY** — ${youtube_video_id ? "Clickable YouTube thumbnail with a SMALL subtle '▶ WATCH' pill badge in the corner (not a giant overlay)." : "Brief recap."} PULL-QUOTES from the transcript are the star here — make them impossible to ignore. Each quote should feel like a reason to attend.${custom_image_urls && custom_image_urls.length > 0 ? " Scatter the custom event images naturally throughout like photos taped to a poster wall — NO section header, just candid placement at slight angles with border treatments." : ""}
4. **🎫 TICKET STUBS** — NO "THE DETAILS" header. Date/time stamped as a rotated badge. Each community link (Discord, X, YouTube, Farcaster, Web) is its own individual CONCERT TICKET STUB — rectangular with dashed perforated borders on one side, platform name as bold headliner text, slightly rotated, scattered like actual tickets on a table. Think: you just emptied your pockets after a night out and these ticket stubs fell out.

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
