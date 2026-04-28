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

const GUEST_OVERRIDES: Record<string, string[]> = {
  "0X1SxcbuG40": ["Pierce_NFT"],
  "-fQWgh5TVLk": ["Ol1y Art", "Fabiano"],
  "3Kv4JyLdQwU": ["Reneil"],
  "6o15XnMVTe4": [],
  "8bAjqzMzzF8": ["Argent", "CodeTrip", "Stellacat"],
  HFhqKFfejcs: ["Metageist"],
  iyBmasDMUMA: ["FlyFrogs", "Spherical Art"],
  RV2mGGeeRW0: [],
  n74Nu9HIjHE: ["Jin aka DankVR", "Openvoxels"],
  odVsoispuwg: ["Roustan"],
  oXFJjo4POuE: ["Benjy Bitpixi", "CVminigames"],
  quZrDqvycdI: [],
  "rQvZoZJ-viw": ["AnonSnail"],
  saiyAAhaI6I: ["EpicDylan", "TRINI protocol", "Lapin Mignon"],
  tpzk6lcpBj8: ["AL Crego", "0xSnail"],
  uDBrYHUgTKk: ["TheBeatMiner"],
  "vr5v5-49vGk": ["Fractilians"],
  xK98kbyKdm0: ["Matt"],
  zJAaWoVUVCc: ["Coldie"],
};

const TOPIC_BEFORE_WITH_PATTERN = /\b(blockchain radio|decentraland|dcl|dclgx|field trip|tour|hunt|party|event|festival|gallery|race|racing|build|takeover|deep dive|alpha|launch|drop|giveaway|adventure|wipmas|hyperfy|metaverse|cryptovoxels|voxels|parcel|wellness|music|meme nfa|wipson|babacci|tipn|museum|radio|grand opening)\b/i;
const TOPIC_SUFFIX_PATTERN = /\s+\b(tour|deep dive|field trip|alpha|event|panel|takeover|birthday party|body part|forest of|marblecards|spatial art|voxel tour|voxels tour|art exhibit|reading|drag racing|vrm drop|music drop|charity drive|peek|surprise unveiling|talking|tribute|plane crash|game building|racing|build|launch|server kickoff|rebuild|animal spawn|bedtime stories|hiddenforces|upgrades|competition|gaming|hyperworld|with the|pirate adventure)\b.*$/i;

function cleanGuestName(name: string): string | null {
  const cleaned = name
    .replace(/^@/, "")
    .replace(/\s*@([\w.-]+)/g, " $1")
    .replace(/\s*\d+\/\d+\/?$/, "")
    .replace(/\s*Mash(up)?$/i, "")
    .replace(/\s*by\s+Paradoxx$/i, "")
    .replace(TOPIC_SUFFIX_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!cleaned || cleaned.length <= 1 || cleaned.length >= 50) return null;
  if (/^(raw footage|field trip|tour|deep dive|panel|event|birthday cake party|the wip crew)$/i.test(cleaned)) return null;
  return cleaned;
}

function expandGuestChunk(chunk: string): string[] {
  const normalized = chunk.trim();
  if (!normalized) return [];

  const withMatch = normalized.match(/(.+?)\s+w\/\s+(.+)/i);
  const candidates = withMatch
    ? TOPIC_BEFORE_WITH_PATTERN.test(withMatch[1])
      ? [withMatch[2]]
      : TOPIC_BEFORE_WITH_PATTERN.test(withMatch[2])
        ? [withMatch[1]]
        : [withMatch[1], withMatch[2]]
    : [normalized];

  return candidates
    .flatMap((candidate) => candidate.split(/\s*(?:&|,|\+|\band\b)\s*/))
    .map(cleanGuestName)
    .filter((guest): guest is string => Boolean(guest));
}

// Parse guests from video title
// Common formats: "ft. Guest1 & Guest2", "ft Guest1, Guest2", "featuring Guest"
export function parseGuestsFromTitle(title: string): string[] {
  const ftMatch = title.match(/(?:ft\.?|featuring)\s+([^|]+?)(?:\s*[|\-–—]|$|\s+Mashup|\s+Mash\s+by|\s+Raw\s+Footage)/i);
  if (!ftMatch) return [];

  const guests = ftMatch[1]
    .split(/\s*(?:&|,|\+|\band\b)\s*/)
    .flatMap(expandGuestChunk);

  return Array.from(new Set(guests));
}

export function getGuestsForEpisode(videoId: string, title: string): string[] {
  return GUEST_OVERRIDES[videoId] || parseGuestsFromTitle(title);
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

function getNewestStoredEpisode(): Episode | null {
  return EPISODES_DATA.reduce<Episode | null>((newest, data) => {
    const episode = createEpisode({
      videoId: data.videoId,
      title: data.title,
      publishedAt: parsePublishDate(data.publishDate),
    });

    return !newest || episode.publishedAt.getTime() > newest.publishedAt.getTime() ? episode : newest;
  }, null);
}

export function createEpisode({
  videoId,
  title,
  publishedAt,
  thumbnail,
}: {
  videoId: string;
  title: string;
  publishedAt: Date;
  thumbnail?: string;
}): Episode {
  return {
    videoId,
    title,
    thumbnail: thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    publishedAt,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    guests: getGuestsForEpisode(videoId, title),
    episodeNumber: parseEpisodeNumber(title),
  };
}

export function isNewerThanStoredCursor(episode: Episode, cursor: Episode | null): boolean {
  if (!cursor) return true;
  if (episode.videoId === cursor.videoId) return false;
  const episodeTime = episode.publishedAt.getTime();
  const cursorTime = cursor.publishedAt.getTime();
  if (episodeTime > cursorTime) return true;

  // YouTube stream dates parsed from titles are day-level dates, while the static archive can
  // contain a newer non-meetup upload on the same day. Keep same-day meetup videos in scope so
  // the newest Thursday event is not dropped behind shorts/clips that share the archive cursor day.
  return episodeTime === cursorTime && /The WIP Meetup/i.test(episode.title);
}

// Fetch live recent videos from the API
async function fetchLiveVideos(cursor: Episode | null): Promise<Episode[]> {
  const API_BASE =
    (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
    "https://api.thewipmeetup.com";

  try {
    const toEpisodes = (videos: any[]) => videos.map((v: any) => {
      // Priority: date from title > relative date > fallback to now
      const publishedAt = parseDateFromTitle(v.title)
        || parseRelativeDate(v.publishedAt)
        || new Date();
      return createEpisode({
        videoId: v.videoId,
        title: v.title,
        publishedAt,
        thumbnail: v.thumbnail,
      });
    }).filter((episode: Episode) => isNewerThanStoredCursor(episode, cursor));

    const params = new URLSearchParams({ count: "15" });
    if (cursor) {
      params.set("afterVideoId", cursor.videoId);
      params.set("afterDate", cursor.publishedAt.toISOString());
    }
    const response = await fetch(`${API_BASE}/api/youtube-latest?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      const fallbackResponse = await fetch(`${API_BASE}/api/youtube-latest`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!fallbackResponse.ok) return [];
      const fallbackData = await fallbackResponse.json();
      return fallbackData.videoId ? toEpisodes([fallbackData]) : [];
    }
    const data = await response.json();
    const videos = data.videos || [data];
    return toEpisodes(videos);
  } catch {
    return [];
  }
}

async function fetchNewsletterReplayVideos(cursor: Episode | null): Promise<Episode[]> {
  try {
    const newsletters = await fetchNewsletters();
    return newsletters
      .map((issue) => {
        const videoId = getYouTubeIdFromIssue(issue);
        if (!videoId) return null;
        const title = getTitleFromIssue(issue);
        const publishedAt = parseDateFromTitle(title)
          || parsePublishDate(issue.published_at || issue.week_of || issue.created_at);
        return createEpisode({
          videoId,
          title,
          publishedAt,
        });
      })
      .filter((episode): episode is Episode => Boolean(episode) && isNewerThanStoredCursor(episode, cursor));
  } catch {
    return [];
  }
}

// Fetch all events, merging live data with static archive
export async function fetchAllEpisodes(): Promise<Episode[]> {
  // Build archive map
  const archiveMap = new Map<string, Episode>();
  EPISODES_DATA.forEach(data => {
    archiveMap.set(data.videoId, createEpisode({
      videoId: data.videoId,
      title: data.title,
      publishedAt: parsePublishDate(data.publishDate),
    }));
  });

  // Fetch only live/newsletter videos newer than the latest stored archive cursor.
  const newestStoredEpisode = getNewestStoredEpisode();
  const [liveVideos, newsletterVideos] = await Promise.all([
    fetchLiveVideos(newestStoredEpisode),
    fetchNewsletterReplayVideos(newestStoredEpisode),
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
