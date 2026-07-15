import { API_BASE } from "./api";
import {
  buildNewsletterPosterHtml,
  buildNewsletterPosterMarkdown,
  getNextMeetupDateLabel,
  resolveSpeakerAvatarUrl,
} from "./newsletterPoster";

export type NewsletterStatus = "draft" | "published";

export interface NewsletterSpeaker {
  name: string;
  twitter?: string;
  farcaster?: string;
  topic?: string;
  bio?: string;
  profile_image_url?: string;
}

export interface NewsletterIssue {
  id: string;
  title: string;
  subtitle?: string;
  body_html: string;
  body_markdown: string;
  speakers: NewsletterSpeaker[];
  recap_summary?: string;
  cover_image?: string;
  youtube_video_id?: string;
  status: NewsletterStatus;
  created_at: string;
  published_at?: string;
  event_date?: string;
  week_of: string; // ISO date string for the week this covers
}

export async function fetchNewsletters(): Promise<NewsletterIssue[]> {
  const res = await fetch(`${API_BASE}/api/newsletter`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { newsletters: NewsletterIssue[] };
  return data.newsletters ?? [];
}

export async function fetchNewsletter(id: string): Promise<NewsletterIssue | null> {
  const res = await fetch(`${API_BASE}/api/newsletter?id=${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { newsletter: NewsletterIssue };
  return data.newsletter ?? null;
}

/**
 * Build a full poster-style draft locally.
 * Restores the visual layout the old AI generator produced (logo, speaker PFPs,
 * YouTube cover, community sections) without calling the disabled generate API.
 */
export function createManualNewsletterDraft(payload: {
  speakers: NewsletterSpeaker[];
  transcript?: string;
  youtube_video_id?: string;
  youtube_video_title?: string;
}): NewsletterIssue {
  const now = new Date().toISOString();
  const id = `wip-weekly-${Date.now()}`;
  const speakers = payload.speakers
    .filter((s) => s.name.trim())
    .map((s) => ({
      ...s,
      profile_image_url: resolveSpeakerAvatarUrl(s),
    }));
  const meetupDate = getNextMeetupDateLabel();
  const title = `WIP Meetup - ${meetupDate}`;
  const youtubeId = payload.youtube_video_id?.trim() || "";
  const youtubeTitle = payload.youtube_video_title?.trim() || "";
  const recap =
    payload.transcript?.trim() ||
    (youtubeId
      ? "Missed last week? Our guests dropped some incredible insights — catch the replay!"
      : "Add this week's recap here.");

  const body_html = buildNewsletterPosterHtml({
    speakers,
    transcript: payload.transcript,
    youtube_video_id: youtubeId,
    youtube_video_title: youtubeTitle,
  });
  const body_markdown = buildNewsletterPosterMarkdown({
    title,
    speakers,
    transcript: payload.transcript,
    youtube_video_id: youtubeId,
    youtube_video_title: youtubeTitle,
  });

  return {
    id,
    title,
    subtitle: "",
    body_html,
    body_markdown,
    speakers,
    recap_summary: recap.slice(0, 280),
    cover_image: youtubeId
      ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
      : undefined,
    youtube_video_id: youtubeId,
    status: "draft",
    created_at: now,
    week_of: now,
  };
}

export async function saveNewsletter(issue: Partial<NewsletterIssue> & { id: string }): Promise<void> {
  const res = await fetch(`${API_BASE}/api/newsletter?action=save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(issue),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function publishNewsletter(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/newsletter?action=save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id, status: "published", published_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function deleteNewsletter(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/newsletter?action=delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
