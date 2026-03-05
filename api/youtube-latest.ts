import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /api/youtube-latest — Returns recent videos from The WIP Meetup YouTube channel.
 * Query params:
 *   count=N  — number of videos to return (default 1, max 15)
 * Server-side fetch avoids CORS issues with YouTube RSS feeds.
 * Caches for 1 hour via CDN headers.
 */

const CHANNEL_ID = "UCRwQrMcwYE3K7gfP5nQVgng";

interface VideoResult {
  videoId: string;
  title: string;
  publishedAt?: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=7200");

  const count = Math.min(Math.max(parseInt(String(req.query.count)) || 1, 1), 15);

  try {
    // Strategy 1: YouTube RSS feed (direct server-side, no CORS issues)
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
    const rssResponse = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WIPMeetupBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });

    if (rssResponse.ok) {
      const text = await rssResponse.text();
      const videos = parseRSSVideos(text, count);
      if (videos.length > 0) {
        if (count === 1) {
          return res.status(200).json({ ...videos[0], source: "youtube-rss" });
        }
        return res.status(200).json({ videos, source: "youtube-rss" });
      }
    }

    // Strategy 2: Invidious API instances
    const invidiousInstances = [
      "https://inv.nadeko.net",
      "https://invidious.fdn.fr",
      "https://invidious.privacyredirect.com",
      "https://vid.puffyan.us",
    ];

    for (const instance of invidiousInstances) {
      try {
        const response = await fetch(
          `${instance}/api/v1/channels/${CHANNEL_ID}/videos?fields=videoId,title,publishedText,published&sort_by=newest`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!response.ok) continue;
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const videos: VideoResult[] = data.slice(0, count).map((v: any) => ({
            videoId: v.videoId,
            title: v.title,
            publishedAt: v.publishedText || undefined,
          }));
          if (count === 1) {
            return res.status(200).json({ ...videos[0], source: "invidious" });
          }
          return res.status(200).json({ videos, source: "invidious" });
        }
      } catch {
        continue;
      }
    }

    return res.status(502).json({ error: "All YouTube sources unavailable" });
  } catch (err: any) {
    console.error("youtube-latest error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function parseRSSVideos(xml: string, count: number): VideoResult[] {
  const videos: VideoResult[] = [];
  // Match all entries
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  while ((match = entryRegex.exec(xml)) !== null && videos.length < count) {
    const entry = match[1];
    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
    if (videoIdMatch && titleMatch) {
      videos.push({
        videoId: videoIdMatch[1],
        title: titleMatch[1],
        publishedAt: publishedMatch?.[1] || undefined,
      });
    }
  }
  return videos;
}
