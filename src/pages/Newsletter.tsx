import { useState, useEffect, useRef } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, ExternalLink } from "lucide-react";
import { type NewsletterIssue, fetchNewsletters, fetchNewsletter } from "@/lib/newsletter";
import { useNewsletterLogoFallback } from "@/hooks/use-newsletter-logo-fallback";
import wipLogo from "@/assets/wip-logo-static.png";

const API_BASE =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ||
  "https://api.thewipmeetup.com";

function proxyUnavatarHtml(html: string): string {
  // Back-compat for older issues that stored unavatar URLs directly.
  return html.replace(
    /https:\/\/unavatar\.io\/(farcaster|twitter)\/([a-zA-Z0-9_.-]+)/g,
    (_m, service: string, handle: string) => {
      const key = service === "farcaster" ? "farcaster" : "twitter";
      return `${API_BASE}/api/newsletter?action=avatar&${key}=${encodeURIComponent(handle)}`;
    },
  );
}

const Newsletter = () => {
  const [issues, setIssues] = useState<NewsletterIssue[]>([]);
  const [selected, setSelected] = useState<NewsletterIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const posterRef = useRef<HTMLDivElement>(null);
  useNewsletterLogoFallback(posterRef, selected?.body_html || "");

  useEffect(() => {
    fetchNewsletters()
      .then((all) => {
        setIssues(all.filter((i) => i.status === "published"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openIssue = async (id: string) => {
    const full = await fetchNewsletter(id);
    if (full) setSelected(full);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="WIP Weekly Newsletter"
        description="Catch up on the latest from The WIP Meetup — weekly recaps, speaker spotlights, and community highlights."
        canonical="/newsletter"
      />
      <Navigation />

      <main className="min-h-screen px-4 pt-24 pb-12">
        <div className="container mx-auto max-w-4xl">
          {/* Reading a single issue */}
          {selected ? (
            <div className="space-y-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft className="w-4 h-4" />
                All Issues
              </Button>

              {selected.cover_image && (
                <img
                  src={selected.cover_image}
                  alt={selected.title}
                  className="w-full rounded-xl"
                />
              )}

              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  {selected.title}
                </h1>
                {selected.subtitle && (
                  <p className="text-lg text-muted-foreground">
                    {selected.subtitle}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(selected.published_at || selected.created_at).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" }
                    )}
                  </span>
                  {selected.speakers?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      ft. {selected.speakers.map((s) => s.name).join(", ")}
                    </span>
                  )}
                </div>
              </div>

              {/* Newsletter poster content */}
              <div
                ref={posterRef}
                className="newsletter-poster-preview rounded-xl overflow-hidden"
                style={{ background: "#0a0612" }}
                dangerouslySetInnerHTML={{ __html: proxyUnavatarHtml(selected.body_html) }}
              />

              {/* CTA */}
              <div className="rounded-xl border border-border bg-secondary/30 p-6 text-center space-y-3">
                <img src={wipLogo} alt="WIP" className="w-12 h-12 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Don't miss the next meetup — every Thursday at 3 PM ET
                </p>
                <Button variant="electric" size="sm" asChild>
                  <a
                    href="https://discord.gg/XHDcUdm3"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join Discord
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            /* Issue list */
            <div className="space-y-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  WIP Weekly
                </h1>
                <p className="text-muted-foreground">
                  Weekly recaps, speaker spotlights, and community highlights
                  from The WIP Meetup.
                </p>
              </div>

              {loading ? (
                <p className="text-muted-foreground">Loading newsletters…</p>
              ) : issues.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-10 text-center space-y-4">
                  <img src={wipLogo} alt="WIP" className="w-16 h-16 mx-auto opacity-50" />
                  <h2 className="text-xl font-semibold">Coming Soon</h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    The WIP Weekly newsletter is launching soon. Subscribe on{" "}
                    <a
                      href="https://thewipmeetup.substack.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Substack
                    </a>{" "}
                    to get it in your inbox.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {issues.map((issue) => (
                    <button
                      key={issue.id}
                      onClick={() => openIssue(issue.id)}
                      className="group rounded-xl border border-border bg-card p-0 overflow-hidden text-left hover:border-primary/40 transition-colors"
                    >
                      {issue.cover_image && (
                        <img
                          src={issue.cover_image}
                          alt={issue.title}
                          className="w-full h-40 object-cover group-hover:scale-[1.02] transition-transform"
                        />
                      )}
                      <div className="p-4 space-y-2">
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
                          {new Date(
                            issue.published_at || issue.created_at
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {issue.speakers?.length > 0 && (
                            <span>
                              • ft. {issue.speakers.map((s) => s.name).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Substack CTA */}
              <div className="rounded-xl border border-border bg-secondary/30 p-6 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold">Get it in your inbox</h3>
                  <p className="text-sm text-muted-foreground">
                    Subscribe on Substack to never miss an issue.
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://thewipmeetup.substack.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Subscribe
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Newsletter;
