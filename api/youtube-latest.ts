import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /api/youtube-latest — Returns recent videos from The WIP Meetup YouTube channel.
 * Query params:
 *   count=N  — number of videos to return (default 1, max 15)
 * Scrapes the YouTube channel page for video data (RSS feeds are deprecated/404).
 * Caches for 1 hour via CDN headers.
 */

const CHANNEL_HANDLE = "@thewipmeetup";
const CHANNEL_ID = "UCRwQrMcwYE3K7gfP5nQVgng";

interface VideoResult {
  videoId: string;
  title: string;
  publishedAt?: string;
  thumbnail?: string;
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
    // Strategy 1: Scrape YouTube channel page for video data
    const channelVideos = await scrapeChannelVideos(count);
    if (channelVideos.length > 0) {
      if (count === 1) {
        return res.status(200).json({ ...channelVideos[0], source: "youtube-scrape" });
      }
      return res.status(200).json({ videos: channelVideos, source: "youtube-scrape" });
    }

    // Strategy 2: Try YouTube RSS feed (sometimes works)
    const rssVideos = await fetchRSSVideos(count);
    if (rssVideos.length > 0) {
      if (count === 1) {
        return res.status(200).json({ ...rssVideos[0], source: "youtube-rss" });
      }
      return res.status(200).json({ videos: rssVideos, source: "youtube-rss" });
    }

    // Strategy 3: Invidious API instances
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

/**
 * Scrape the YouTube channel /videos page for video IDs and titles.
 * YouTube embeds initial data as JSON in the page HTML.
 */
async function scrapeChannelVideos(count: number): Promise<VideoResult[]> {
  try {
    // Fetch the channel's videos tab
    const url = `https://www.youtube.com/${CHANNEL_HANDLE}/streams`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.log(`YouTube scrape failed with status ${response.status}`);
      return [];
    }

    const html = await response.text();

    // Extract ytInitialData JSON from the page. YouTube may emit either
    // `var ytInitialData = ...` or `ytInitialData = ...`, so use balanced braces.
    const initialDataJson = extractYtInitialDataJson(html);
    if (!initialDataJson) {
      console.log("Could not find ytInitialData in YouTube page");
      // Fallback: try regex to find video IDs and titles directly
      return extractVideosFromHTML(html, count);
    }

    try {
      const data = JSON.parse(initialDataJson);
      return extractVideosFromInitialData(data, count);
    } catch (parseErr) {
      console.log("Failed to parse ytInitialData:", parseErr);
      return extractVideosFromHTML(html, count);
    }
  } catch (err) {
    console.log("YouTube scrape error:", err);
    return [];
  }
}

function extractYtInitialDataJson(html: string): string | null {
  const marker = "ytInitialData";
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;
  const start = html.indexOf("{", markerIndex);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }

  return null;
}

/**
 * Extract videos from ytInitialData JSON structure
 */
function extractVideosFromInitialData(data: any, count: number): VideoResult[] {
  const videos: VideoResult[] = [];
  const seen = new Set<string>();

  const addVideo = (vid: any) => {
    if (!vid?.videoId || seen.has(vid.videoId)) return false;
    const title = vid.title?.runs?.[0]?.text || vid.title?.simpleText || "The WIP Meetup";
    const publishedAt = vid.publishedTimeText?.simpleText || undefined;
    const thumbnails = vid.thumbnail?.thumbnails || [];
    const thumbnail = thumbnails[thumbnails.length - 1]?.url?.replace(/\\u0026/g, "&");
    seen.add(vid.videoId);
    videos.push({ videoId: vid.videoId, title, publishedAt, thumbnail });
    return videos.length >= count;
  };

  const walk = (node: any): boolean => {
    if (!node || typeof node !== "object") return false;
    if (addVideo(node.videoRenderer) || addVideo(node.gridVideoRenderer)) return true;
    if (addVideo(node.reelItemRenderer) || addVideo(node.compactVideoRenderer)) return true;
    if (Array.isArray(node)) {
      for (const item of node) if (walk(item)) return true;
      return false;
    }
    for (const value of Object.values(node)) if (walk(value)) return true;
    return false;
  };

  try {
    // Navigate the nested YouTube data structure
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const selectedStreamsTab = tabs.find((tab: any) => {
      const renderer = tab?.tabRenderer;
      return renderer?.selected || renderer?.title === "Live" || renderer?.endpoint?.browseEndpoint?.canonicalBaseUrl?.endsWith("/streams");
    });
    if (selectedStreamsTab && walk(selectedStreamsTab.tabRenderer?.content)) return videos;

    if (walk(tabs)) return videos;
    
    for (const tab of tabs) {
      const tabRenderer = tab?.tabRenderer;
      if (!tabRenderer?.content) continue;

      const sectionList = tabRenderer.content.richGridRenderer?.contents ||
                          tabRenderer.content.sectionListRenderer?.contents || [];

      for (const section of sectionList) {
        // richGridRenderer items
        const richItem = section?.richItemRenderer?.content?.videoRenderer;
        if (richItem?.videoId) {
          const title = richItem.title?.runs?.[0]?.text || richItem.title?.simpleText || "";
          const publishedAt = richItem.publishedTimeText?.simpleText || undefined;
          videos.push({ videoId: richItem.videoId, title, publishedAt });
          if (videos.length >= count) return videos;
          continue;
        }

        // sectionListRenderer items
        const itemSection = section?.itemSectionRenderer?.contents || [];
        for (const item of itemSection) {
          const gridRenderer = item?.gridRenderer?.items || item?.shelfRenderer?.content?.gridRenderer?.items || [];
          for (const gridItem of gridRenderer) {
            const vid = gridItem?.gridVideoRenderer;
            if (vid?.videoId) {
              const title = vid.title?.runs?.[0]?.text || vid.title?.simpleText || "";
              const publishedAt = vid.publishedTimeText?.simpleText || undefined;
              videos.push({ videoId: vid.videoId, title, publishedAt });
              if (videos.length >= count) return videos;
            }
          }
        }
      }
    }
  } catch (err) {
    console.log("Error navigating ytInitialData:", err);
  }

  return videos;
}

/**
 * Fallback: extract video data using regex patterns from raw HTML
 */
function extractVideosFromHTML(html: string, count: number): VideoResult[] {
  const videos: VideoResult[] = [];
  const seen = new Set<string>();

  const rendererPattern = /"videoRenderer"\s*:\s*\{([\s\S]*?)(?=\}\s*,\s*"trackingParams"|\}\s*\}\s*,\s*\{)/g;
  let rendererMatch;
  while ((rendererMatch = rendererPattern.exec(html)) !== null && videos.length < count) {
    const block = rendererMatch[1];
    const videoId = block.match(/"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/)?.[1];
    if (!videoId || seen.has(videoId)) continue;
    const title = block.match(/"title"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/)?.[1]
      || block.match(/"title"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/)?.[1]
      || "The WIP Meetup";
    const publishedAt = block.match(/"publishedTimeText"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/)?.[1];
    const thumbMatches = [...block.matchAll(/"url"\s*:\s*"(https:\/\/i\.ytimg\.com\/vi\/[^"]+)"/g)];
    const thumbnail = thumbMatches[thumbMatches.length - 1]?.[1]?.replace(/\\u0026/g, "&");
    seen.add(videoId);
    videos.push({ videoId, title, publishedAt, thumbnail });
  }

  if (videos.length >= count) return videos;

  // Pattern: "videoId":"XXXX" near "title":{"runs":[{"text":"TITLE"}]}
  const videoPattern = /"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/g;
  const titlePattern = /"title"\s*:\s*\{\s*"runs"\s*:\s*\[\s*\{\s*"text"\s*:\s*"([^"]+)"/g;

  // Collect all video IDs
  const videoIds: string[] = [];
  let match;
  while ((match = videoPattern.exec(html)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      videoIds.push(match[1]);
    }
  }

  // Collect all titles
  const titles: string[] = [];
  while ((match = titlePattern.exec(html)) !== null) {
    titles.push(match[1]);
  }

  // Match them up (best effort)
  for (let i = 0; i < Math.min(videoIds.length, count); i++) {
    videos.push({
      videoId: videoIds[i],
      title: titles[i] || `The WIP Meetup`,
    });
  }

  return videos;
}

/**
 * Try the YouTube RSS feed (deprecated, may 404)
 */
async function fetchRSSVideos(count: number): Promise<VideoResult[]> {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
    const response = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WIPMeetupBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return [];

    const text = await response.text();
    const videos: VideoResult[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(text)) !== null && videos.length < count) {
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
  } catch {
    return [];
  }
}
