import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthContext";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles, Plus, Trash2, Send, Eye, Save, Loader2, ArrowLeft, Youtube,
} from "lucide-react";
import {
  type NewsletterSpeaker,
  type NewsletterIssue,
  generateNewsletter,
  saveNewsletter,
  publishNewsletter,
  fetchNewsletters,
} from "@/lib/newsletter";

const API_BASE =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  "https://api.thewipmeetup.com";

const AdminNewsletter = () => {
  const { user } = useAuth();
  const [speakers, setSpeakers] = useState<NewsletterSpeaker[]>([
    { name: "", twitter: "", farcaster: "", topic: "" },
  ]);
  const [transcript, setTranscript] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [autoFetchingVideo, setAutoFetchingVideo] = useState(false);

  const [draft, setDraft] = useState<NewsletterIssue | null>(null);
  const [editableHtml, setEditableHtml] = useState("");
  const [editableMarkdown, setEditableMarkdown] = useState("");
  const [editableTitle, setEditableTitle] = useState("");

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [pastIssues, setPastIssues] = useState<NewsletterIssue[]>([]);
  const [view, setView] = useState<"compose" | "preview" | "history">("compose");

  // Auto-fetch latest YouTube video
  useEffect(() => {
    async function fetchLatestVideo() {
      setAutoFetchingVideo(true);
      try {
        const res = await fetch(`${API_BASE}/api/youtube-latest?count=1`);
        if (res.ok) {
          const data = await res.json();
          const vid = data.videoId || data.videos?.[0]?.videoId;
          if (vid) setYoutubeVideoId(vid);
        }
      } catch { /* ignore */ }
      setAutoFetchingVideo(false);
    }
    void fetchLatestVideo();
  }, []);

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

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    const validSpeakers = speakers.filter((s) => s.name.trim());
    if (validSpeakers.length === 0) {
      setFeedback({ type: "error", msg: "Add at least one speaker name" });
      return;
    }

    setGenerating(true);
    setFeedback(null);
    try {
      const issue = await generateNewsletter({
        speakers: validSpeakers,
        transcript: transcript.trim() || undefined,
        youtube_video_id: youtubeVideoId.trim() || undefined,
      });
      setDraft(issue);
      setEditableHtml(issue.body_html);
      setEditableMarkdown(issue.body_markdown);
      setEditableTitle(issue.title);
      setView("preview");
      setFeedback({ type: "success", msg: "Newsletter generated! Review and edit below." });
    } catch (err) {
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Generation failed",
      });
    } finally {
      setGenerating(false);
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
                Generate and publish the weekly newsletter
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
            <form onSubmit={handleGenerate} className="space-y-6">
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
                  Auto-pulled from your channel. This will be used for the recap & cover image.
                </p>
                {youtubeVideoId ? (
                  <div className="space-y-2">
                    <img
                      src={`https://img.youtube.com/vi/${youtubeVideoId}/mqdefault.jpg`}
                      alt="Latest video thumbnail"
                      className="rounded-md w-full max-w-sm"
                    />
                    <Input
                      value={youtubeVideoId}
                      onChange={(e) => setYoutubeVideoId(e.target.value)}
                      placeholder="YouTube video ID"
                      className="max-w-sm bg-background"
                    />
                  </div>
                ) : (
                  <Input
                    value={youtubeVideoId}
                    onChange={(e) => setYoutubeVideoId(e.target.value)}
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
                {speakers.map((speaker, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-border/50 bg-background p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Speaker {idx + 1}
                      </span>
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
                        placeholder="@twitter handle"
                        value={speaker.twitter || ""}
                        onChange={(e) => updateSpeaker(idx, "twitter", e.target.value)}
                        className="bg-card"
                      />
                      <Input
                        placeholder="@farcaster handle"
                        value={speaker.farcaster || ""}
                        onChange={(e) => updateSpeaker(idx, "farcaster", e.target.value)}
                        className="bg-card"
                      />
                    </div>
                  </div>
                ))}
              </section>

              {/* Transcript / Notes */}
              <section className="rounded-lg border border-border bg-card p-5 space-y-3">
                <h2 className="text-lg font-semibold">Last Week's Recap</h2>
                <p className="text-xs text-muted-foreground">
                  Paste a Discord/YouTube transcript or bullet-point notes. AI will expand this into
                  an engaging recap.
                </p>
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste transcript or notes here... (optional — AI will generate a general recap if empty)"
                  rows={8}
                  className="bg-background"
                />
              </section>

              {/* Generate */}
              <Button
                type="submit"
                size="lg"
                disabled={generating}
                className="w-full sm:w-auto"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating newsletter…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Newsletter
                  </>
                )}
              </Button>
            </form>
          )}

          {/* PREVIEW VIEW */}
          {view === "preview" && draft && (
            <div className="space-y-6">
              <Button variant="ghost" size="sm" onClick={() => setView("compose")}>
                <ArrowLeft className="w-4 h-4" />
                Back to compose
              </Button>

              {/* Editable title */}
              <Input
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="text-2xl font-bold bg-card border-border"
              />

              {/* Cover image */}
              {draft.cover_image && (
                <img
                  src={draft.cover_image}
                  alt="Newsletter cover"
                  className="w-full rounded-lg"
                />
              )}

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
                      className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => {
                        setDraft(issue);
                        setEditableHtml(issue.body_html);
                        setEditableMarkdown(issue.body_markdown);
                        setEditableTitle(issue.title);
                        setView("preview");
                      }}
                    >
                      <div>
                        <div className="font-medium">{issue.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(issue.created_at).toLocaleDateString()} •{" "}
                          {issue.speakers?.map((s) => s.name).join(", ") || "No speakers"}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                          issue.status === "published"
                            ? "bg-accent/20 text-accent"
                            : "bg-wip-yellow/20 text-foreground"
                        }`}
                      >
                        {issue.status}
                      </span>
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
