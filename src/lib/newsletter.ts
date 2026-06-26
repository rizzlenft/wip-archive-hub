// Newsletter types and utilities

import { API_BASE } from "./api";

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

function formatTitleDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Build an editable draft locally (AI generation is disabled on the API). */
export function createManualNewsletterDraft(payload: {
  speakers: NewsletterSpeaker[];
  transcript?: string;
  youtube_video_id?: string;
}): NewsletterIssue {
  const now = new Date().toISOString();
  const id = `wip-weekly-${Date.now()}`;
  const speakers = payload.speakers.filter((s) => s.name.trim());
  const names = speakers.map((s) => s.name.trim()).join(", ");
  const title = `The WIP Meetup ${formatTitleDate(new Date())}${names ? ` — ft ${names}` : ""}`;
  const recap = payload.transcript?.trim() || "Add this week's recap here.";

  const speakerMarkdown = speakers
    .map((s) => {
      const handles = [s.twitter && `@${s.twitter}`, s.farcaster && `@${s.farcaster}`]
        .filter(Boolean)
        .join(" · ");
      const topic = s.topic?.trim() ? `\n\n**Topic:** ${s.topic.trim()}` : "";
      return `### ${s.name.trim()}${handles ? ` (${handles})` : ""}${topic}`;
    })
    .join("\n\n");

  const body_markdown = `## This Week's Speakers\n\n${speakerMarkdown}\n\n## Last Week's Recap\n\n${recap}`;
  const speakerHtml = speakers
    .map((s) => {
      const topic = s.topic?.trim() ? `<p><strong>Topic:</strong> ${escapeHtml(s.topic.trim())}</p>` : "";
      return `<h3>${escapeHtml(s.name.trim())}</h3>${topic}`;
    })
    .join("");
  const body_html = `<h2>This Week's Speakers</h2>${speakerHtml}<h2>Last Week's Recap</h2><p>${escapeHtml(recap).replace(/\n/g, "<br>")}</p>`;

  const youtubeId = payload.youtube_video_id?.trim() || "";

  return {
    id,
    title,
    body_html,
    body_markdown,
    speakers,
    recap_summary: recap.slice(0, 280),
    cover_image: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : undefined,
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
