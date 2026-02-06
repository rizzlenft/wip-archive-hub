// YouTube RSS feed utilities for The WIP Meetup channel

export interface Episode {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: Date;
  url: string;
  guests: string[];
  episodeNumber: number | null;
}

// Parse guests from video title
// Common formats: "ft. Guest1 & Guest2", "ft Guest1, Guest2", "featuring Guest"
export function parseGuestsFromTitle(title: string): string[] {
  const guests: string[] = [];
  
  // Match patterns like "ft. Name & Name", "ft Name, Name", "featuring Name"
  const ftMatch = title.match(/(?:ft\.?|featuring)\s+([^|]+?)(?:\s*[|\-–—]|$)/i);
  if (ftMatch) {
    const guestString = ftMatch[1].trim();
    // Split by common separators: &, and, ,
    const guestNames = guestString.split(/\s*(?:&|,|\band\b)\s*/);
    guestNames.forEach(name => {
      const cleaned = name.trim();
      if (cleaned && cleaned.length > 1 && cleaned.length < 50) {
        guests.push(cleaned);
      }
    });
  }
  
  return guests;
}

// Extract episode number from title
export function parseEpisodeNumber(title: string): number | null {
  // Match patterns like "Meetup 292", "Meetup #292", "Episode 292"
  const match = title.match(/(?:meetup|episode)\s*#?\s*(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  // Try to match just a number after "WIP"
  const wipMatch = title.match(/WIP\s+(\d+)/i);
  if (wipMatch) {
    return parseInt(wipMatch[1], 10);
  }
  
  return null;
}

// Parse a single RSS entry into an Episode
function parseEntry(entry: Element): Episode | null {
  const videoId = entry.querySelector("yt\\:videoId, videoId")?.textContent || "";
  const title = entry.querySelector("title")?.textContent || "";
  const publishedStr = entry.querySelector("published")?.textContent || "";
  
  if (!videoId || !title) return null;
  
  const publishedAt = publishedStr ? new Date(publishedStr) : new Date();
  
  return {
    videoId,
    title,
    thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    publishedAt,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    guests: parseGuestsFromTitle(title),
    episodeNumber: parseEpisodeNumber(title),
  };
}

// Fetch all episodes from YouTube RSS feed
export async function fetchAllEpisodes(): Promise<Episode[]> {
  const channelId = "UCRwQrMcwYE3K7gfP5nQVgng";
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  
  const proxyConfigs = [
    { url: `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`, isJson: true },
    { url: `https://corsproxy.io/?${encodeURIComponent(rssUrl)}`, isJson: false },
    { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssUrl)}`, isJson: false },
  ];
  
  for (const proxy of proxyConfigs) {
    try {
      const response = await fetch(proxy.url, {
        headers: { 'Accept': 'application/xml, text/xml, */*' }
      });
      
      if (!response.ok) continue;
      
      let text: string;
      if (proxy.isJson) {
        const json = await response.json();
        text = json.contents;
      } else {
        text = await response.text();
      }
      
      if (!text || text.includes('Error 404') || text.includes('<!DOCTYPE html>') || !text.includes('<entry>')) {
        continue;
      }
      
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const entries = xml.querySelectorAll("entry");
      
      const episodes: Episode[] = [];
      entries.forEach(entry => {
        const episode = parseEntry(entry);
        if (episode) {
          episodes.push(episode);
        }
      });
      
      if (episodes.length > 0) {
        console.log(`✅ Fetched ${episodes.length} episodes from RSS`);
        return episodes;
      }
    } catch (error) {
      console.log("Proxy failed:", error);
      continue;
    }
  }
  
  // Return fallback episodes if RSS fails
  console.log("⚠️ Using fallback episodes - RSS unavailable");
  return getFallbackEpisodes();
}

// Get unique guests from all episodes
export function extractUniqueGuests(episodes: Episode[]): string[] {
  const guestSet = new Set<string>();
  episodes.forEach(ep => {
    ep.guests.forEach(guest => guestSet.add(guest));
  });
  return Array.from(guestSet).sort();
}

// Group episodes by year
export function groupEpisodesByYear(episodes: Episode[]): Map<number, Episode[]> {
  const grouped = new Map<number, Episode[]>();
  
  episodes.forEach(episode => {
    const year = episode.publishedAt.getFullYear();
    if (!grouped.has(year)) {
      grouped.set(year, []);
    }
    grouped.get(year)!.push(episode);
  });
  
  // Sort each year's episodes by date (newest first)
  grouped.forEach((eps, year) => {
    eps.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  });
  
  return grouped;
}

// Fallback episodes when RSS is unavailable
function getFallbackEpisodes(): Episode[] {
  const fallbackData = [
    { videoId: "A_CrnPJrI7M", title: "The WIP Meetup 2/5/2026 Raw Footage ft Stina Jones & Carlos Marcial", date: "2026-02-05" },
    { videoId: "bcDx_9I9vJc", title: "The WIP Meetup 291", date: "2026-01-29" },
    { videoId: "L6wVfn9_jlA", title: "The WIP Meetup 290", date: "2026-01-22" },
    { videoId: "rJHxWrCHQEY", title: "The WIP Meetup 289", date: "2026-01-15" },
    { videoId: "dQw4w9WgXcQ", title: "The WIP Meetup 288 ft MetaGamer & VR Pioneer", date: "2026-01-08" },
    { videoId: "dQw4w9WgXcQ", title: "The WIP Meetup 287", date: "2026-01-01" },
  ];
  
  return fallbackData.map(data => ({
    videoId: data.videoId,
    title: data.title,
    thumbnail: `https://img.youtube.com/vi/${data.videoId}/mqdefault.jpg`,
    publishedAt: new Date(data.date),
    url: `https://www.youtube.com/watch?v=${data.videoId}`,
    guests: parseGuestsFromTitle(data.title),
    episodeNumber: parseEpisodeNumber(data.title),
  }));
}
