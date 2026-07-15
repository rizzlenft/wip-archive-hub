import { useState, useEffect, useRef, type FormEvent } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, Send, Eye, Save, Loader2, ArrowLeft, Youtube, User, CheckCircle2, XCircle, AlertCircle, Clock, FileText,
} from "lucide-react";
import { SubstackExportModal } from "@/components/SubstackExportModal";
import { useAuth } from "@/auth/AuthContext";
import {
  type NewsletterSpeaker,
  type NewsletterIssue,
  createManualNewsletterDraft,
  saveNewsletter,
  publishNewsletter,
  fetchNewsletters,
  deleteNewsletter,
} from "@/lib/newsletter";
import { useNewsletterLogoFallback } from "@/hooks/use-newsletter-logo-fallback";

import { API_BASE } from "@/lib/api";

function buildAvatarProxyUrl(params: { url?: string | null; farcaster?: string; twitter?: string; name?: string }): string {
  const qs = new URLSearchParams();
  if (params.url) qs.set("url", params.url);
  if (params.farcaster) qs.set("farcaster", params.farcaster);
  if (params.twitter) qs.set("twitter", params.twitter);
  if (params.name) qs.set("name", params.name);
  if (![...qs.keys()].length) return "";
  return `${API_BASE}/api/newsletter?action=avatar&${qs.toString()}`;
}

function isAvatarProxyUrl(url?: string): boolean {
  return Boolean(url && (url.startsWith("https://unavatar.io/") || url.includes("/api/newsletter?action=avatar")));
}

function tryParseUrl(raw: string): URL | null {
  const v = raw.trim();
  if (!v) return null;

  try {
    return new URL(v);
  } catch {
    // If someone pasted "x.com/user" without protocol
    if (/^(?:www\.)?(x\.com|twitter\.com|warpcast\.com|farcaster\.xyz)\//i.test(v)) {
      try {
        return new URL(`https://${v}`);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeTwitterHandle(input?: string): string {
  if (!input) return "";
  let v = input.trim();
  if (!v) return "";

  v = v.replace(/^@/, "");

  const url = tryParseUrl(v);
  if (url && /(x\.com|twitter\.com)$/i.test(url.hostname.replace(/^www\./, ""))) {
    const seg = url.pathname.split("/").filter(Boolean)[0] || "";
    v = seg;
  }

  v = v.replace(/^@/, "").trim();
  // keep common handle chars
  v = v.replace(/[^a-zA-Z0-9_.]/g, "");
  return v;
}

function normalizeFarcasterHandle(input?: string): string {
  if (!input) return "";
  let v = input.trim();
  if (!v) return "";

  v = v.replace(/^@/, "");

  const url = tryParseUrl(v);
  if (url && /(warpcast\.com|farcaster\.xyz)$/i.test(url.hostname.replace(/^www\./, ""))) {
    const seg = url.pathname.split("/").filter(Boolean)[0] || "";
    // ignore non-user paths like /~/channel/...
    v = seg.startsWith("~") ? "" : seg;
  }

  v = v.replace(/^@/, "").trim();
  v = v.replace(/[^a-zA-Z0-9_.-]/g, "");
  return v;
}

function normalizeProfileImageUrlFromText(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (raw.startsWith("data:")) return null;

  const url = tryParseUrl(raw);
  if (url) {
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "x.com" || host === "twitter.com") {
      const handle = normalizeTwitterHandle(raw);
      return handle ? `https://unavatar.io/twitter/${handle}` : null;
    }

    if (host === "warpcast.com" || host === "farcaster.xyz") {
      const handle = normalizeFarcasterHandle(raw);
      return handle ? `https://unavatar.io/farcaster/${handle}` : null;
    }

    // If it's already a direct URL (image or otherwise), keep it as-is
    return raw;
  }

  return null;
}

const ALLOWED_ADMIN_EMAILS = [
  "rizzlenft@gmail.com",
  "dragonatebusiness@gmail.com",
  "something.rom8@gmail.com",
];

const AdminNewsletter = () => {
  const { user, loading: authLoading, isAuthenticated, login } = useAuth();

  const [speakers, setSpeakers] = useState<NewsletterSpeaker[]>([
    { name: "", twitter: "", farcaster: "", topic: "" },
  ]);
  const [transcript, setTranscript] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [youtubeVideoTitle, setYoutubeVideoTitle] = useState("");
  
  const [autoFetchingVideo, setAutoFetchingVideo] = useState(false);
  

  const [draft, setDraft] = useState<NewsletterIssue | null>(null);
  const [editableHtml, setEditableHtml] = useState("");
  const [editableMarkdown, setEditableMarkdown] = useState("");
  const [editableTitle, setEditableTitle] = useState("");

  const [creatingDraft, setCreatingDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [pastIssues, setPastIssues] = useState<NewsletterIssue[]>([]);
  const [view, setView] = useState<"compose" | "preview" | "history">("compose");
  const [substackExportOpen, setSubstackExportOpen] = useState(false);

  // Track PFP load status per speaker: "loading" | "resolved" | "failed"
  const [pfpStatus, setPfpStatus] = useState<Record<number, { status: "loading" | "resolved" | "failed"; source?: string; triedFallback?: boolean; resolvedUrl?: string }>>({});

  const posterPreviewRef = useRef<HTMLDivElement>(null);
  useNewsletterLogoFallback(posterPreviewRef, editableHtml);

  // Probe avatar URLs via JS Image objects (more reliable than inline img onError for cross-origin)
  useEffect(() => {
    speakers.forEach((speaker, idx) => {
      const status = pfpStatus[idx];
      if (!status || status.status !== "loading") return;

      const fc = normalizeFarcasterHandle(speaker.farcaster);
      const tw = normalizeTwitterHandle(speaker.twitter);
      const normalizedProfileUrl = speaker.profile_image_url
        ? normalizeProfileImageUrlFromText(speaker.profile_image_url)
        : null;

      let urlToTry = "";
      let source: "farcaster" | "twitter" | "url" | "" = "";

      if (normalizedProfileUrl) {
        urlToTry = buildAvatarProxyUrl({ url: normalizedProfileUrl });
        source = "url";
      } else if (fc && !status.triedFallback) {
        urlToTry = buildAvatarProxyUrl({ farcaster: fc });
        source = "farcaster";
      } else if (tw) {
        urlToTry = buildAvatarProxyUrl({ twitter: tw });
        source = "twitter";
      } else if (fc) {
        urlToTry = buildAvatarProxyUrl({ farcaster: fc });
        source = "farcaster";
      }

      if (!urlToTry) {
        setPfpStatus((prev) => ({ ...prev, [idx]: { ...prev[idx], status: "failed" } }));
        return;
      }

      const img = new Image();
      img.onload = () => {
        setPfpStatus((prev) => ({
          ...prev,
          [idx]: { status: "resolved", source, triedFallback: prev[idx]?.triedFallback, resolvedUrl: urlToTry },
        }));
      };
      img.onerror = () => {
        // If Farcaster failed and we have a Twitter handle, try fallback
        if (source === "farcaster" && tw && !status.triedFallback) {
          setPfpStatus((prev) => ({
            ...prev,
            [idx]: { status: "loading", source: "farcaster", triedFallback: true },
          }));
        } else {
          setPfpStatus((prev) => ({
            ...prev,
            [idx]: { status: "failed", source, triedFallback: status.triedFallback },
          }));
        }
      };
      img.src = urlToTry;
    });
  }, [speakers, pfpStatus]);

  // Auto-fetch latest YouTube video (id + title)
  useEffect(() => {
    async function fetchLatestVideo() {
      setAutoFetchingVideo(true);
      try {
        const res = await fetch(`${API_BASE}/api/youtube-latest?count=1`);
        if (res.ok) {
          const data = await res.json();
          const first = data.videos?.[0] ?? data;
          const vid = typeof first?.videoId === "string" ? first.videoId : "";
          const title = typeof first?.title === "string" ? first.title : "";
          if (vid) {
            setYoutubeVideoId(vid);
            setYoutubeVideoTitle(title);
          }
        }
      } catch { /* ignore */ }
      setAutoFetchingVideo(false);
    }
    void fetchLatestVideo();
  }, []);

  const extractYoutubeId = (raw: string): string => {
    const value = raw.trim();
    if (!value) return "";
    try {
      const url = new URL(value.startsWith("http") ? value : `https://${value}`);
      if (url.hostname.includes("youtu.be")) {
        return url.pathname.split("/").filter(Boolean)[0] || "";
      }
      if (url.hostname.includes("youtube.com")) {
        return url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop() || "";
      }
    } catch {
      // not a URL — treat as bare id
    }
    const match = value.match(/[a-zA-Z0-9_-]{11}/);
    return match?.[0] || value;
  };

  const handleYoutubeInputChange = async (raw: string) => {
    const vid = extractYoutubeId(raw);
    setYoutubeVideoId(vid);
    if (!vid) {
      setYoutubeVideoTitle("");
      return;
    }
    // If the user pasted a different id, try to resolve its title from the latest feed
    try {
      const res = await fetch(`${API_BASE}/api/youtube-latest?count=15`);
      if (!res.ok) return;
      const data = await res.json();
      const videos = Array.isArray(data.videos) ? data.videos : data.videoId ? [data] : [];
      const match = videos.find((v: { videoId?: string }) => v.videoId === vid);
      setYoutubeVideoTitle(typeof match?.title === "string" ? match.title : "");
    } catch {
      setYoutubeVideoTitle("");
    }
  };

  // Fetch past issues
  useEffect(() => {
    fetchNewsletters()
      .then(setPastIssues)
      .catch(() => {});
  }, []);

  const addSpeaker = () => {
    setSpeakers((prev) => [...prev, { name: "", twitter: "", farcaster: "", topic: "" }]);
  };

  const removeSpeaker = (idx: number) => {
    setSpeakers((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSpeaker = (idx: number, field: keyof NewsletterSpeaker, value: string) => {
    setSpeakers((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  };

  const handleCreateDraft = (e: FormEvent) => {
    e.preventDefault();
    const validSpeakers = speakers.filter((s) => s.name.trim());
    if (validSpeakers.length === 0) {
      setFeedback({ type: "error", msg: "Add at least one speaker name" });
      return;
    }

    setCreatingDraft(true);
    setFeedback(null);
    try {
      const cleanedSpeakers = validSpeakers.map((s) => {
        const twitter = normalizeTwitterHandle(s.twitter);
        const farcaster = normalizeFarcasterHandle(s.farcaster);

        const normalizedPfp = s.profile_image_url
          ? normalizeProfileImageUrlFromText(s.profile_image_url)
          : null;

        const profile_image_url =
          (isAvatarProxyUrl(s.profile_image_url) ? s.profile_image_url : undefined) ||
          (normalizedPfp ? buildAvatarProxyUrl({ url: normalizedPfp }) : "") ||
          (farcaster ? buildAvatarProxyUrl({ farcaster }) : "") ||
          (twitter ? buildAvatarProxyUrl({ twitter }) : "") ||
          undefined;

        return {
          ...s,
          twitter: twitter || undefined,
          farcaster: farcaster || undefined,
          profile_image_url,
        };
      });

      const issue = createManualNewsletterDraft({
        speakers: cleanedSpeakers,
        transcript: transcript.trim() || undefined,
        youtube_video_id: youtubeVideoId.trim() || undefined,
        youtube_video_title: youtubeVideoTitle.trim() || undefined,
      });
      setDraft(issue);
      setEditableHtml(issue.body_html);
      setEditableMarkdown(issue.body_markdown);
      setEditableTitle(issue.title);
      setView("preview");
      setFeedback({
        type: "success",
        msg: "Poster draft created with speaker photos and layout — edit below, then save and publish.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed to create draft",
      });
    } finally {
      setCreatingDraft(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await saveNewsletter({
        id: draft.id,
        title: editableTitle,
        body_html: editableHtml,
        body_markdown: editableMarkdown,
      });
      setFeedback({ type: "success", msg: "Draft saved!" });
    } catch {
      setFeedback({ type: "error", msg: "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!draft) return;
    setPublishing(true);
    try {
      // Save final edits first
      await saveNewsletter({
        id: draft.id,
        title: editableTitle,
        body_html: editableHtml,
        body_markdown: editableMarkdown,
      });
      await publishNewsletter(draft.id);
      setFeedback({ type: "success", msg: "🎉 Newsletter published!" });
      setDraft({ ...draft, status: "published" });
      // Refresh past issues
      fetchNewsletters().then(setPastIssues).catch(() => {});
    } catch {
      setFeedback({ type: "error", msg: "Publish failed" });
    } finally {
      setPublishing(false);
    }
  };


  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const userEmail = user?.email?.toLowerCase();
  const isAuthorized = isAuthenticated && userEmail && ALLOWED_ADMIN_EMAILS.includes(userEmail);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold">Sign In Required</h1>
            <p className="text-muted-foreground">
              You need to sign in to access the newsletter editor.
            </p>
            <Button onClick={() => login("/admin/newsletter")}>
              Sign In with TokenSmart
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">
              Your account ({userEmail}) does not have permission to access the newsletter editor. Contact the WIP team for access.
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Return to Homepage
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="min-h-screen px-4 pt-24 pb-12">
        <div className="container mx-auto max-w-4xl space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                WIP Weekly Editor
              </h1>
              <p className="text-sm text-muted-foreground">
                Compose speakers + recap, then create a full poster draft to edit and publish
              </p>
            </div>
            <div className="flex gap-1">
              {(["compose", "preview", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setView(tab)}
                  disabled={tab === "preview" && !draft}
                  className={`
                    relative px-5 py-2.5 text-xs font-bold uppercase tracking-[0.15em] 
                    border-2 border-dashed transition-all duration-200
                    disabled:opacity-30 disabled:cursor-not-allowed
                    ${view === tab
                      ? "bg-accent text-accent-foreground border-accent shadow-[0_0_12px_hsl(var(--accent)/0.4)] -rotate-1 scale-105 z-10"
                      : "bg-card text-muted-foreground border-border/60 hover:border-accent/50 hover:text-foreground rotate-[0.5deg]"
                    }
                  `}
                  style={{
                    clipPath: "polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)",
                    borderRadius: "2px",
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    {tab === "preview" && <Eye className="w-3.5 h-3.5" />}
                    {tab === "compose" ? "✏️ Compose" : tab === "preview" ? "Preview" : "📦 History"}
                  </span>
                  {view === tab && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-accent rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                feedback.type === "success"
                  ? "border-accent/30 bg-accent/10 text-accent"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {feedback.msg}
            </div>
          )}

          {/* COMPOSE VIEW */}
          {view === "compose" && (
            <form onSubmit={handleCreateDraft} className="space-y-6">
              {/* YouTube auto-pull */}
              <section className="rounded-lg border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Youtube className="w-5 h-5 text-destructive" />
                  <h2 className="text-lg font-semibold">Latest YouTube Video</h2>
                  {autoFetchingVideo && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-pulled from your channel (latest episode + title). Used for the recap cover image.
                </p>
                {youtubeVideoId ? (
                  <div className="space-y-2">
                    <img
                      src={`https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`}
                      alt={youtubeVideoTitle || "Latest video thumbnail"}
                      className="rounded-md w-full max-w-sm"
                    />
                    {youtubeVideoTitle && (
                      <p className="text-sm font-medium text-foreground max-w-sm leading-snug">
                        {youtubeVideoTitle}
                      </p>
                    )}
                    <Input
                      value={youtubeVideoId}
                      onChange={(e) => void handleYoutubeInputChange(e.target.value)}
                      placeholder="YouTube video ID"
                      className="max-w-sm bg-background"
                    />
                  </div>
                ) : (
                  <Input
                    value={youtubeVideoId}
                    onChange={(e) => void handleYoutubeInputChange(e.target.value)}
                    placeholder="Paste YouTube video ID or URL"
                    className="max-w-sm bg-background"
                  />
                )}
              </section>

              {/* Speakers */}
              <section className="rounded-lg border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">This Week's Speakers</h2>
                  <Button type="button" variant="outline" size="sm" onClick={addSpeaker}>
                    <Plus className="w-4 h-4" />
                    Add Speaker
                  </Button>
                </div>

                <div className={`grid grid-cols-1 gap-4 ${speakers.length >= 2 ? "sm:grid-cols-2" : ""}`}>
                  {speakers.map((speaker, idx) => {
                    const fc = normalizeFarcasterHandle(speaker.farcaster);
                    const tw = normalizeTwitterHandle(speaker.twitter);
                    const normalizedProfileUrl = speaker.profile_image_url
                      ? normalizeProfileImageUrlFromText(speaker.profile_image_url)
                      : null;

                    const speakerPfpStatus = pfpStatus[idx];

                    // Determine PFP source for badge display, with fallback logic
                    let pfpUrl = "";
                    let pfpSource: "farcaster" | "twitter" | "url" | "" = "";
                    if (normalizedProfileUrl) {
                      pfpUrl = buildAvatarProxyUrl({ url: normalizedProfileUrl });
                      pfpSource = "url";
                    } else if (fc && !speakerPfpStatus?.triedFallback) {
                      // Try Farcaster first if we haven't already tried fallback
                      pfpUrl = buildAvatarProxyUrl({ farcaster: fc });
                      pfpSource = "farcaster";
                    } else if (tw) {
                      // Use Twitter if no Farcaster, or if Farcaster failed (triedFallback=true)
                      pfpUrl = buildAvatarProxyUrl({ twitter: tw });
                      pfpSource = "twitter";
                    } else if (fc) {
                      // Farcaster-only with no Twitter fallback available
                      pfpUrl = buildAvatarProxyUrl({ farcaster: fc });
                      pfpSource = "farcaster";
                    }

                    return (
                      <div
                        key={idx}
                        className="rounded-md border border-border/50 bg-background p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-muted-foreground">
                              Speaker {idx + 1}
                            </span>
                            {/* PFP Status Badge */}
                            {pfpUrl && (
                              speakerPfpStatus?.status === "loading" ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50">
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  Checking…
                                </span>
                              ) : speakerPfpStatus?.status === "resolved" ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  {speakerPfpStatus.triedFallback && pfpSource === "twitter" 
                                    ? "Fallback: Twitter/X" 
                                    : speakerPfpStatus.source === "farcaster" 
                                      ? "Farcaster" 
                                      : speakerPfpStatus.source === "twitter" 
                                        ? "Twitter/X" 
                                        : "Direct URL"}
                                </span>
                              ) : speakerPfpStatus?.status === "failed" ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                                  <XCircle className="w-2.5 h-2.5" />
                                  Failed — check handle
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-accent/10 text-accent border border-accent/20">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  {pfpSource === "farcaster" ? "via Farcaster" : pfpSource === "twitter" ? "via Twitter/X" : "via URL"}
                                </span>
                              )
                            )}
                            {!pfpUrl && (fc || tw || speaker.profile_image_url) && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                                <XCircle className="w-2.5 h-2.5" />
                                No PFP resolved
                              </span>
                            )}
                          </div>
                          {speakers.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSpeaker(idx)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Input
                            placeholder="Name *"
                            value={speaker.name}
                            onChange={(e) => updateSpeaker(idx, "name", e.target.value)}
                            className="bg-card"
                            required={idx === 0}
                          />
                          <Input
                            placeholder="Topic / what they'll discuss"
                            value={speaker.topic || ""}
                            onChange={(e) => updateSpeaker(idx, "topic", e.target.value)}
                            className="bg-card"
                          />
                          <Input
                            placeholder="@farcaster handle (auto-fetches PFP)"
                            value={speaker.farcaster || ""}
                            onChange={(e) => {
                              updateSpeaker(idx, "farcaster", e.target.value);
                              setPfpStatus((prev) => ({ ...prev, [idx]: { status: "loading", source: "farcaster" } }));
                            }}
                            onBlur={(e) => updateSpeaker(idx, "farcaster", normalizeFarcasterHandle(e.target.value))}
                            className="bg-card"
                          />
                          <Input
                            placeholder="@twitter handle"
                            value={speaker.twitter || ""}
                            onChange={(e) => {
                              updateSpeaker(idx, "twitter", e.target.value);
                              setPfpStatus((prev) => ({ ...prev, [idx]: { status: "loading", source: "twitter" } }));
                            }}
                            onBlur={(e) => updateSpeaker(idx, "twitter", normalizeTwitterHandle(e.target.value))}
                            className="bg-card"
                          />
                        </div>

                        {/* PFP Section */}
                        <div className="flex items-center gap-3 pt-1">
                          <div className="relative shrink-0">
                            {speakerPfpStatus?.resolvedUrl ? (
                              <img
                                src={speakerPfpStatus.resolvedUrl}
                                referrerPolicy="no-referrer"
                                alt={`${speaker.name} avatar`}
                                className="w-14 h-14 rounded-full border-2 border-accent object-cover"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                                <User className="w-6 h-6 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 space-y-1">
                            <label className="text-xs text-muted-foreground font-medium">
                              Profile Image URL (paste from socials)
                            </label>
                            <Input
                              placeholder="Paste a Twitter/X or Farcaster profile URL — or a direct image URL"
                              value={speaker.profile_image_url || ""}
                              onChange={(e) => {
                                updateSpeaker(idx, "profile_image_url", e.target.value);
                                setPfpStatus((prev) => ({ ...prev, [idx]: { status: "loading", source: "url" } }));
                              }}
                              onBlur={(e) => {
                                const normalized = normalizeProfileImageUrlFromText(e.target.value);
                                if (normalized) updateSpeaker(idx, "profile_image_url", normalized);
                              }}
                              onPaste={(e) => {
                                const text = e.clipboardData?.getData("text/plain")?.trim();
                                if (text) {
                                  const normalized = normalizeProfileImageUrlFromText(text);
                                  if (normalized) {
                                    e.preventDefault();
                                    updateSpeaker(idx, "profile_image_url", normalized);
                                    setPfpStatus((prev) => ({ ...prev, [idx]: { status: "loading", source: "url" } }));
                                    return;
                                  }
                                }

                                // If the user pasted an actual image, we can't persist it (no upload flow here)
                                const items = e.clipboardData?.items;
                                if (!items) return;
                                for (const item of Array.from(items)) {
                                  if (item.type.startsWith("image/")) {
                                    e.preventDefault();
                                    setFeedback({
                                      type: "error",
                                      msg: "Pasted an image file — please paste a profile link/handle or a direct image URL instead.",
                                    });
                                    return;
                                  }
                                }
                              }}
                              className="bg-card text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Transcript / Notes */}
              <section className="rounded-lg border border-border bg-card p-5 space-y-3">
                <h2 className="text-lg font-semibold">Last Week's Recap</h2>
                <p className="text-xs text-muted-foreground">
                  Paste recap notes or a transcript. This becomes the starting text in your draft — edit freely in preview.
                </p>
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste transcript or bullet-point notes for last week's recap…"
                  rows={8}
                  className="bg-background"
                />
              </section>


              <Button
                type="submit"
                size="lg"
                disabled={creatingDraft}
                className="w-full sm:w-auto"
              >
                {creatingDraft ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating draft…
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Create Draft
                  </>
                )}
              </Button>
            </form>
          )}

          {/* PREVIEW VIEW */}
          {view === "preview" && draft && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setView("compose")}>
                  <ArrowLeft className="w-4 h-4" />
                  Back to compose
                </Button>
              </div>

              {/* Editable title */}
              <Input
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="text-2xl font-bold bg-card border-border"
              />


              {/* Poster Preview */}
              <div className="rounded-xl overflow-hidden" style={{ background: '#0a0612' }}>
                <div className="bg-muted/30 px-4 py-2 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-medium">🎪 Poster Preview</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      draft.status === "published"
                        ? "bg-accent/20 text-accent"
                        : "bg-wip-yellow/20 text-foreground"
                    }`}
                  >
                    {draft.status}
                  </span>
                </div>
                <div
                  ref={posterPreviewRef}
                  className="newsletter-poster-preview"
                  dangerouslySetInnerHTML={{ __html: editableHtml }}
                />
              </div>

              {/* Editable Markdown */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Edit Markdown Source
                </h3>
                <Textarea
                  value={editableMarkdown}
                  onChange={(e) => setEditableMarkdown(e.target.value)}
                  rows={20}
                  className="font-mono text-xs bg-card"
                />
              </section>

              {/* Actions */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Draft
                </Button>
                <Button onClick={handlePublish} disabled={publishing || draft.status === "published"}>
                  {publishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {draft.status === "published" ? "Published ✓" : "Publish"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSubstackExportOpen(true)}
                  className="border-accent/50 text-accent hover:bg-accent/10"
                >
                  <FileText className="w-4 h-4" />
                  Export to Substack
                </Button>
                <SubstackExportModal
                  open={substackExportOpen}
                  onOpenChange={setSubstackExportOpen}
                  markdown={editableMarkdown}
                  html={editableHtml}
                  title={editableTitle}
                />
              </div>
            </div>
          )}

          {/* HISTORY VIEW */}
          {view === "history" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Past Issues</h2>
              {pastIssues.length === 0 ? (
                <p className="text-muted-foreground text-sm">No newsletters yet.</p>
              ) : (
                <div className="space-y-3">
                  {pastIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setDraft(issue);
                          setEditableHtml(issue.body_html);
                          setEditableMarkdown(issue.body_markdown);
                          setEditableTitle(issue.title);
                          setView("preview");
                        }}
                      >
                        <div className="font-medium">{issue.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(issue.created_at).toLocaleDateString()} •{" "}
                          {issue.speakers?.map((s) => s.name).join(", ") || "No speakers"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            issue.status === "published"
                              ? "bg-accent/20 text-accent"
                              : "bg-wip-yellow/20 text-foreground"
                          }`}
                        >
                          {issue.status}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`Delete "${issue.title}"? This cannot be undone.`)) return;
                            try {
                              await deleteNewsletter(issue.id);
                              setPastIssues((prev) => prev.filter((i) => i.id !== issue.id));
                              setFeedback({ type: "success", msg: `Deleted "${issue.title}"` });
                            } catch {
                              setFeedback({ type: "error", msg: "Failed to delete" });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminNewsletter;
