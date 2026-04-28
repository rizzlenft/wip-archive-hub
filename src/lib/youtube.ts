// YouTube utilities for The WIP Meetup channel

import { EPISODES_DATA } from "./episodesData";
import { fetchNewsletters, type NewsletterIssue } from "./newsletter";

export interface Episode {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: Date;
  url: string;
  guests: string[];
  episodeNumber: number | null;
}

export type Event = Episode;

// Parse guests from video title
// Common formats: "ft. Guest1 & Guest2", "ft Guest1, Guest2", "featuring Guest"
export function parseGuestsFromTitle(title: string): string[] {
  const guests: string[] = [];
  
  // Match patterns like "ft. Name & Name", "ft Name, Name", "featuring Name", "w/ Name"
  const ftMatch = title.match(/(?:ft\.?|featuring|w\/)\s+([^|]+?)(?:\s*[|\-–—]|$|\s+Mashup|\s+Raw\s+Footage)/i);
  if (ftMatch) {
    const guestString = ftMatch[1].trim();
    // Split by common separators: &, and, ,, +
    const guestNames = guestString.split(/\s*(?:&|,|\+|\band\b)\s*/);
    guestNames.forEach(name => {
      // Clean up the name - remove common suffixes
      let cleaned = name.trim()
        .replace(/\s*@\w+/g, '') // Remove @handles
        .replace(/\s*\d+\/\d+\/?$/, '') // Remove trailing dates like 1/2
        .replace(/\s*Mash(up)?$/i, '') // Remove "Mash" or "Mashup"
        .replace(/\s*by\s+Paradoxx$/i, '') // Remove "by Paradoxx"
        .trim();
      
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

// Parse date string to Date object
function parsePublishDate(dateStr: string): Date {
  if (!dateStr) {
    return new Date();
  }
  
  // Handle formats like "Feb 12, 2024", "Mar 28, 2025"
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return new Date();
}

// Parse a date from a video title like "The WIP Meetup 3/05/2026 ..."
function parseDateFromTitle(title: string): Date | null {
  // Match M/DD/YYYY or MM/DD/YYYY patterns
  const match = title.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, month, day, year] = match;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

// Parse relative time strings like "Streamed 17 hours ago", "2 days ago", "3 weeks ago"
function parseRelativeDate(text: string): Date | null {
  if (!text) return null;
  const cleaned = text.replace(/^Streamed\s+/i, '').trim();
  const match = cleaned.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (!match) return null;
  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const now = new Date();
  const ms: Record<string, number> = {
    second: 1000, minute: 60000, hour: 3600000,
    day: 86400000, week: 604800000, month: 2592000000, year: 31536000000,
  };
  return new Date(now.getTime() - amount * (ms[unit] || 0));
}

function getYouTubeIdFromIssue(issue: NewsletterIssue): string | undefined {
  if (issue.youtube_video_id) return issue.youtube_video_id;
  const body = `${issue.body_html || ""} ${issue.body_markdown || ""}`;
  return body.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
}

function getTitleFromIssue(issue: NewsletterIssue): string {
  const body = issue.body_html || issue.body_markdown || "";
  return body.match(/<span[^>]*>(The WIP Meetup[^<]+)<\/span>/i)?.[1]
    ?.replace(/&#39;/g, "'")
    ?.replace(/&amp;/g, "&")
    || issue.title
    || "The WIP Meetup replay";
}

// Fetch live recent videos from the API
async function fetchLiveVideos(): Promise<Episode[]> {
  const API_BASE =
    (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
    "https://api.thewipmeetup.com";

  try {
    const response = await fetch(`${API_BASE}/api/youtube-latest?count=10`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const data = await response.json();
    const videos = data.videos || [data];
    return videos.map((v: any) => {
      // Priority: date from title > relative date > fallback to now
      const publishedAt = parseDateFromTitle(v.title)
        || parseRelativeDate(v.publishedAt)
        || new Date();
      return {
        videoId: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
        publishedAt,
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        guests: parseGuestsFromTitle(v.title),
        episodeNumber: parseEpisodeNumber(v.title),
      };
    });
  } catch {
    return [];
  }
}

async function fetchNewsletterReplayVideos(): Promise<Episode[]> {
  try {
    const newsletters = await fetchNewsletters();
    return newsletters
      .map((issue) => {
        const videoId = getYouTubeIdFromIssue(issue);
        if (!videoId) return null;
        const title = getTitleFromIssue(issue);
        const publishedAt = parseDateFromTitle(title)
          || parsePublishDate(issue.published_at || issue.week_of || issue.created_at);
        return {
          videoId,
          title,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          publishedAt,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          guests: parseGuestsFromTitle(title),
          episodeNumber: parseEpisodeNumber(title),
        } satisfies Episode;
      })
      .filter((episode): episode is Episode => Boolean(episode));
  } catch {
    return [];
  }
}

// Fetch all events, merging live data with static archive
export async function fetchAllEpisodes(): Promise<Episode[]> {
  // Build archive map
  const archiveMap = new Map<string, Episode>();
  EPISODES_DATA.forEach(data => {
    archiveMap.set(data.videoId, {
      videoId: data.videoId,
      title: data.title,
      thumbnail: `https://img.youtube.com/vi/${data.videoId}/mqdefault.jpg`,
      publishedAt: parsePublishDate(data.publishDate),
      url: `https://www.youtube.com/watch?v=${data.videoId}`,
      guests: parseGuestsFromTitle(data.title),
      episodeNumber: parseEpisodeNumber(data.title),
    });
  });

  // Fetch live videos and newsletter replay fallbacks, then merge with the static archive.
  const [liveVideos, newsletterVideos] = await Promise.all([
    fetchLiveVideos(),
    fetchNewsletterReplayVideos(),
  ]);
  [...newsletterVideos, ...liveVideos].forEach(ep => {
    archiveMap.set(ep.videoId, ep);
  });

  const episodes = Array.from(archiveMap.values());
  episodes.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  
  console.log(`✅ Loaded ${episodes.length} events (${liveVideos.length} live, ${newsletterVideos.length} newsletter, ${EPISODES_DATA.length} archived)`);
  return episodes;
}

export const fetchAllEvents = fetchAllEpisodes;

// Get unique guests from all episodes
export function extractUniqueGuests(episodes: Episode[]): string[] {
  const guestSet = new Set<string>();
  episodes.forEach(ep => {
    ep.guests.forEach(guest => guestSet.add(guest));
  });
  return Array.from(guestSet).sort();
}

// Group events by year
export function groupEpisodesByYear(episodes: Episode[]): Map<number, Episode[]> {
  const grouped = new Map<number, Episode[]>();
  
  episodes.forEach(episode => {
    const year = episode.publishedAt.getFullYear();
    // Skip episodes with invalid dates
    if (isNaN(year)) return;
    if (!grouped.has(year)) {
      grouped.set(year, []);
    }
    grouped.get(year)!.push(episode);
  });
  
  // Sort each year's episodes by date (newest first)
  grouped.forEach((eps) => {
    eps.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  });
  
  return grouped;
}

export const groupEventsByYear = groupEpisodesByYear;

// Get a random episode for the "Random Episode" feature
export function getRandomEpisode(episodes: Episode[]): Episode | null {
  if (episodes.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * episodes.length);
  return episodes[randomIndex];
}
