import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar, User, ExternalLink, Search, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { type NewsletterIssue, fetchNewsletters, fetchNewsletter } from "@/lib/newsletter";
import { API_BASE as NEWSLETTER_API_BASE } from "@/lib/api";
import { useNewsletterLogoFallback } from "@/hooks/use-newsletter-logo-fallback";
import wipLogo from "@/assets/wip-logo-static.png";


const API_BASE = NEWSLETTER_API_BASE;

// Direct unavatar URLs (proxy bypassed — Vercel function bundle was failing on GET)
function proxyUnavatarHtml(html: string): string {
  return html;
}

function buildAvatarUrl(speaker: { name: string; farcaster?: string; twitter?: string }): string {
  const params = new URLSearchParams({ action: "avatar", name: speaker.name });
  if (speaker.farcaster) params.set("farcaster", speaker.farcaster);
  if (speaker.twitter) params.set("twitter", speaker.twitter);
  return `${NEWSLETTER_API_BASE}/api/newsletter?${params.toString()}`;
}

function getIssueDate(issue: NewsletterIssue): Date {
  const titleMatch = issue.title.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  const rawDate = issue.event_date || (titleMatch ? `${titleMatch[3]}-${titleMatch[1].padStart(2, "0")}-${titleMatch[2].padStart(2, "0")}T12:00:00` : "") || issue.week_of || issue.published_at || issue.created_at;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? new Date(issue.published_at || issue.created_at) : parsed;
}

function cleanTopic(topic?: string): string {
  return (topic || "").replace(/^(topic:\s*)+/i, "").trim();
}

function formatIssueDate(issue: NewsletterIssue, format: "short" | "long") {
  return getIssueDate(issue).toLocaleDateString("en-US", format === "long"
    ? { month: "long", day: "numeric", year: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
}

/** Strip leading cover/thumbnail images from newsletter HTML (e.g. YouTube thumbs from prior week) */
function stripLeadingCoverImage(html: string): string {
  // Remove the first <img> if it's a YouTube thumbnail or generic cover at the very top
  return html.replace(/^\s*(<div[^>]*>\s*)?<img\s[^>]*src=["']https:\/\/img\.youtube\.com\/[^"']*["'][^>]*\/?>(\s*<\/div>)?/i, '$1$2');
}

const Newsletter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [issues, setIssues] = useState<NewsletterIssue[]>([]);
  const [selected, setSelected] = useState<NewsletterIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subStatus, setSubStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subMsg, setSubMsg] = useState("");
  const posterRef = useRef<HTMLDivElement>(null);
  useNewsletterLogoFallback(posterRef, selected?.body_html || "");

  // Scale the newsletter poster on mobile so it renders at native 600px width
  const scalePoster = useCallback(() => {
    const el = posterRef.current;
    if (!el) return;
    const child = el.firstElementChild as HTMLElement | null;
    if (!child) return;
    const containerWidth = el.clientWidth;
    if (containerWidth < 600) {
      const scale = containerWidth / 600;
      child.style.transformOrigin = "top left";
      child.style.transform = `scale(${scale})`;
      child.style.width = "600px";
      el.style.height = `${child.scrollHeight * scale}px`;
    } else {
      child.style.transform = "";
      child.style.width = "";
      el.style.height = "";
    }
  }, []);

  useEffect(() => {
    scalePoster();
    window.addEventListener("resize", scalePoster);
    return () => window.removeEventListener("resize", scalePoster);
  }, [selected, scalePoster]);

  useEffect(() => {
    fetchNewsletters()
      .then((all) => {
        const published = all.filter((i) => i.status === "published");
        setIssues(published);

        // If ?issue=ID is in the URL, auto-open that issue
        const issueId = searchParams.get("issue");
        if (issueId) {
          fetchNewsletter(issueId).then((full) => {
            if (full) setSelected(full);
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openIssue = async (id: string) => {
    const full = await fetchNewsletter(id);
    if (full) {
      setSelected(full);
      setSearchParams({ issue: id }, { replace: true });
    }
  };

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    const email = subEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSubStatus("error");
      setSubMsg("Please enter a valid email address.");
      return;
    }
    setSubStatus("loading");
    try {
      const apiRes = await fetch(`${API_BASE}/api/substack-subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok) {
        setSubStatus("error");
        setSubMsg((data as { error?: string }).error || "Something went wrong.");
        return;
      }
      setSubStatus("success");
      setSubMsg((data as { alreadySubscribed?: boolean }).alreadySubscribed ? "You're already subscribed! 🎉" : "You're subscribed! Check your inbox. 🎉");
      setSubEmail("");
    } catch {
      setSubStatus("error");
      setSubMsg("Network error — please try again.");
    }
  };

  const filteredIssues = issues.filter((issue) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const dateStr = formatIssueDate(issue, "long").toLowerCase();
    return (
      issue.title.toLowerCase().includes(q) ||
      dateStr.includes(q) ||
      issue.speakers?.some((s) => s.name.toLowerCase().includes(q)) ||
      issue.speakers?.some((s) => cleanTopic(s.topic).toLowerCase().includes(q)) ||
      issue.recap_summary?.toLowerCase().includes(q)
    );
  });

  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://thewipmeetup.com/" },
      { "@type": "ListItem", position: 2, name: "Newsletter", item: "https://thewipmeetup.com/newsletter" },
      ...(selected
        ? [{ "@type": "ListItem", position: 3, name: selected.title, item: `https://thewipmeetup.com/newsletter?issue=${selected.id}` }]
        : []),
    ],
  };

  const articleStructuredData = selected
    ? {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: selected.title,
        description:
          selected.recap_summary ||
          `WIP Weekly newsletter ft. ${selected.speakers?.map((s) => s.name).join(", ") || "the WIP community"}`,
        image: [`https://thewipmeetup.com/api/og-newsletter?id=${encodeURIComponent(selected.id)}`],
        datePublished: selected.published_at || selected.created_at,
        dateModified: selected.published_at || selected.created_at,
        author: { "@type": "Organization", name: "The WIP Meetup", url: "https://thewipmeetup.com" },
        publisher: {
          "@type": "Organization",
          name: "The WIP Meetup",
          url: "https://thewipmeetup.com",
          logo: {
            "@type": "ImageObject",
            url: "https://storage.googleapis.com/gpt-engineer-file-uploads/DM2lONnsGyMlKagJreu03ZO2vI43/uploads/1770403228998-wip_logo.gif",
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `https://thewipmeetup.com/newsletter?issue=${selected.id}`,
        },
        about: selected.speakers?.map((s) => ({ "@type": "Person", name: s.name })),
        isPartOf: { "@type": "Periodical", name: "WIP Weekly", url: "https://thewipmeetup.com/newsletter" },
      }
    : null;

  const collectionStructuredData = !selected
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "WIP Weekly Newsletter Archive",
        description: "Weekly recaps, speaker spotlights, and community highlights from The WIP Meetup.",
        url: "https://thewipmeetup.com/newsletter",
        isPartOf: { "@type": "WebSite", name: "The WIP Meetup", url: "https://thewipmeetup.com" },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: issues.length,
          itemListElement: issues.slice(0, 50).map((iss, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            url: `https://thewipmeetup.com/newsletter?issue=${iss.id}`,
            name: iss.title,
          })),
        },
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={selected ? selected.title : "WIP Weekly Newsletter"}
        description={
          selected
            ? selected.recap_summary || `ft. ${selected.speakers?.map(s => s.name).join(", ") || "the WIP community"}`
            : "Read WIP Weekly for event recaps, featured guests, speaker spotlights, and web3 metaverse community highlights from The WIP Meetup."
        }
        canonical={selected ? `/newsletter?issue=${selected.id}` : "/newsletter"}
        ogImage={selected ? `https://thewipmeetup.com/api/og-newsletter?id=${encodeURIComponent(selected.id)}` : undefined}
        ogType={selected ? "article" : "website"}
        structuredData={[
          breadcrumbList,
          ...(articleStructuredData ? [articleStructuredData] : []),
          ...(collectionStructuredData ? [collectionStructuredData] : []),
        ]}
      />
      <Navigation />

      <main className="min-h-screen px-4 pt-24 pb-12">
        <div className="container mx-auto max-w-4xl">
          {/* Reading a single issue */}
          {selected ? (
            <div className="space-y-6">
              <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setSearchParams({}, { replace: true }); }}>
                <ArrowLeft className="w-4 h-4" />
                All Issues
              </Button>


              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">{selected.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatIssueDate(selected, "long")}
                  </span>
                  {selected.speakers?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      ft. {selected.speakers.map((s) => s.name).join(", ")}
                    </span>
                  )}
                </div>
              </div>

              <div
                ref={posterRef}
                className="newsletter-poster-preview rounded-xl overflow-hidden w-full max-w-full"
                style={{ background: "#0a0612" }}
                dangerouslySetInnerHTML={{ __html: stripLeadingCoverImage(proxyUnavatarHtml(selected.body_html)) }}
              />

              <div className="rounded-xl border border-border bg-secondary/30 p-6 text-center space-y-3">
                <img src={wipLogo} alt="WIP" className="w-12 h-12 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Don't miss the next meetup — every Thursday at 3 PM ET
                </p>
                <Button variant="electric" size="sm" asChild>
                  <a href="https://discord.gg/bTjc6k5uss" target="_blank" rel="noopener noreferrer">
                    Join Discord
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            /* Issue list */
            <div className="space-y-8">
              {/* Hero / Subscribe CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative rounded-2xl border border-primary/20 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
                <div className="absolute top-4 right-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                <div className="relative p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6">
                  <div className="flex-1 space-y-4">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                      WIP <span className="text-gradient-rainbow">Weekly</span>
                    </h1>
                    <p className="text-muted-foreground max-w-xl text-base">
                      Weekly recaps, speaker spotlights, and community highlights from The WIP Meetup.
                      Get it delivered to your inbox every week.
                    </p>
                    {subStatus === "success" ? (
                      <div className="flex items-center gap-2 text-sm text-accent font-medium pt-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {subMsg}
                      </div>
                    ) : (
                      <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 pt-3 w-full max-w-lg">
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={subEmail}
                          onChange={(e) => { setSubEmail(e.target.value); setSubStatus("idle"); }}
                          className="bg-card/60 border-primary/20 flex-1 min-w-0 h-12"
                          required
                          disabled={subStatus === "loading"}
                        />
                        <Button
                          type="submit"
                          variant="electric"
                          size="lg"
                          disabled={subStatus === "loading"}
                          className="shrink-0"
                        >
                          {subStatus === "loading" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : null}
                          Subscribe
                        </Button>
                      </form>
                    )}
                    {subStatus === "error" && (
                      <p className="text-xs text-destructive pt-1">{subMsg}</p>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by date, speaker, or topic…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card"
                />
              </div>

              {loading ? (
                <p className="text-muted-foreground">Loading newsletters…</p>
              ) : filteredIssues.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-muted-foreground">No issues match your search.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredIssues.map((issue, idx) => (
                    <motion.button
                      key={issue.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => openIssue(issue.id)}
                      className="group rounded-xl border border-border bg-card p-0 overflow-hidden text-left hover:border-primary/40 transition-colors"
                    >
                      {issue.speakers?.length > 0 && (
                        <div className="flex items-center gap-2 px-3 pt-3">
                          {issue.speakers.slice(0, 4).map((speaker) => (
                            <div key={speaker.name} className="flex flex-col items-center gap-0.5 min-w-0">
                              <img
                                src={
                                  speaker.profile_image_url ||
                                  buildAvatarUrl(speaker)
                                }
                                alt={speaker.name}
                                className="w-9 h-9 rounded-full object-cover border border-primary/30 transition-all duration-200 group-hover:border-primary group-hover:shadow-[0_0_12px_hsl(var(--primary)/0.4)] hover:!scale-110"
                                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(speaker.name)}&background=7c3aed&color=fff&size=36`; }}
                              />
                              <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{speaker.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="p-3 pt-2 space-y-1">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                          {issue.title}
                        </h3>
                        {issue.recap_summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {issue.recap_summary}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatIssueDate(issue, "short")}
                          {issue.speakers?.length > 0 && (
                            <span>• ft. {issue.speakers.map((s) => s.name).join(", ")}</span>
                          )}
                        </div>
                      </div>
                    </motion.button>
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

export default Newsletter;