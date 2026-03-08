import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";
import { setCorsHeaders } from "./_cors.js";
// Force sync

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
  setCorsHeaders(res);
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

  const systemPrompt = `You are the editor of "The WIP Weekly" — the weekly newsletter for The WIP Meetup, 
a vibrant Web3/metaverse community that meets every Thursday at 3 PM ET. The community is warm, creative, 
and passionate about building in the metaverse, NFTs, DAOs, and digital culture.

Your writing style is:
- Energetic and authentic, never corporate
- Uses emojis tastefully (not excessively)
- Speaks directly to the community ("you", "we", "us")
- Celebrates the speakers and their work
- Includes calls to action (join Discord, tune in live, follow speakers)

Generate a newsletter with these sections:
1. **🎙️ This Week's Spotlight** — Preview the upcoming speakers with excitement
2. **🔥 Last Week's Recap** — Engaging summary of what happened
3. **🌐 Community Corner** — A brief community highlight or fun fact
4. **📅 Don't Miss** — Date/time reminder + links

Output the newsletter in both HTML (styled for email with inline styles using a dark theme: bg #0a0612, text #f5f0e8, 
accent pink #ec4899, cyan #2dd4bf) and clean Markdown.

Return a JSON object with these fields:
{
  "title": "catchy newsletter title",
  "subtitle": "one-line teaser",
  "body_html": "full HTML newsletter",
  "body_markdown": "full Markdown newsletter",
  "recap_summary": "2-sentence recap for card preview"
}`;

  const userPrompt = `Generate this week's WIP Weekly newsletter.

**Upcoming Speakers (this Thursday):**
${speakerList}
${videoContext}
${transcriptSection}

Community links:
- Discord: https://discord.gg/XHDcUdm3
- Twitter: https://twitter.com/theWIPmeetup
- YouTube: https://youtube.com/@thewipmeetup
- Farcaster: https://farcaster.xyz/~/channel/thewipmeetup`;

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
