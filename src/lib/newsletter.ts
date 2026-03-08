// Newsletter types and utilities

export type NewsletterStatus = "draft" | "published";

export interface NewsletterSpeaker {
  name: string;
  twitter?: string;
  farcaster?: string;
  topic?: string;
  bio?: string;
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
  week_of: string; // ISO date string for the week this covers
}

const API_BASE =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  "https://api.thewipmeetup.com";

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

export async function generateNewsletter(payload: {
  speakers: NewsletterSpeaker[];
  transcript?: string;
  youtube_video_id?: string;
}): Promise<NewsletterIssue> {
  const res = await fetch(`${API_BASE}/api/newsletter?action=generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return (await res.json()) as NewsletterIssue;
}

export async function saveNewsletter(issue: Partial<NewsletterIssue> & { id: string }): Promise<void> {
  const res = await fetch(`${API_BASE}/api/newsletter-save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(issue),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function publishNewsletter(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/newsletter-save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id, status: "published", published_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
