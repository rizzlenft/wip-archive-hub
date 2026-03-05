import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /api/youtube-latest — Returns the latest video from The WIP Meetup YouTube channel.
 * Server-side fetch avoids CORS issues with YouTube RSS feeds.
 * Caches for 1 hour via CDN headers.
 */

const CHANNEL_ID = "UCRwQrMcwYE3K7gfP5nQVgng";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  // Allow cross-origin requests from the frontend
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  // Cache for 1 hour at the CDN level, revalidate in background
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=7200");

  try {
    // Strategy 1: YouTube RSS feed (direct server-side, no CORS issues)
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
    const rssResponse = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WIPMeetupBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });

    if (rssResponse.ok) {
      const text = await rssResponse.text();
      // Simple XML parsing for the first <entry>
      const videoIdMatch = text.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = text.match(/<entry>[\s\S]*?<title>([^<]+)<\/title>/);

      if (videoIdMatch && titleMatch) {
        return res.status(200).json({
          videoId: videoIdMatch[1],
          title: titleMatch[1],
          source: "youtube-rss",
        });
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
          `${instance}/api/v1/channels/${CHANNEL_ID}/videos?fields=videoId,title&sort_by=newest`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (!response.ok) continue;
        const videos = await response.json();
        if (Array.isArray(videos) && videos.length > 0) {
          return res.status(200).json({
            videoId: videos[0].videoId,
            title: videos[0].title,
            source: "invidious",
          });
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
