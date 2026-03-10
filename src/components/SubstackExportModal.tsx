import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, ImageIcon, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

interface SubstackExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markdown: string;
  html: string;
  title: string;
}

/**
 * Convert newsletter HTML/markdown into clean Substack-compatible markdown.
 * Ensures ALL URLs are wrapped in [text](url) markdown links — no bare URLs.
 * Deduplicates repeated link/ticket-stub sections.
 */
function convertToSubstackMarkdown(rawMarkdown: string, rawHtml: string): string {
  let source = rawMarkdown?.trim() || "";

  if (!source && rawHtml) {
    source = rawHtml
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/h([1-6])>/gi, "\n\n")
      .replace(/<h([1-6])[^>]*>/gi, (_, level) => "#".repeat(Number(level)) + " ")
      .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
      .replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*?)["'][^>]*\/?>/gi, "![$2]($1)")
      .replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, "![]($1)")
      .replace(/<hr\s*\/?>/gi, "\n---\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, " ");
  }

  if (!source) return "";

  let cleaned = source
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/^\s*\|.*\|\s*$/gm, "")
    .replace(/^\s*[-:]+\s*\|.*$/gm, "")
    .replace(/\[PROFILE IMAGE:[^\]]+\]/gi, "")
    .replace(/\[from X\/Twitter\]\s*/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  // Convert bare URLs into markdown links (URLs not already inside [...](...))
  cleaned = cleaned.replace(
    /(?<!\]\()(?<!\()(https?:\/\/[^\s)\]]+)/g,
    (match, _url, offset, full) => {
      const before = full.substring(Math.max(0, offset - 2), offset);
      if (before.endsWith("](") || before.endsWith("!(")) return match;
      
      const preceding = full.substring(Math.max(0, offset - 200), offset);
      const lastOpenParen = preceding.lastIndexOf("](");
      if (lastOpenParen !== -1) {
        const between = preceding.substring(lastOpenParen + 2);
        if (!between.includes(")")) return match;
      }

      try {
        const u = new URL(match);
        const host = u.hostname.replace(/^www\./, "");
        const path = u.pathname.replace(/\/$/, "");
        
        if (host === "discord.gg") return `[Join Discord](${match})`;
        if (host === "x.com" || host === "twitter.com") {
          const handle = path.split("/").filter(Boolean)[0];
          return handle ? `[𝕏 @${handle}](${match})` : `[Follow on X](${match})`;
        }
        if (host === "warpcast.com") {
          const handle = path.split("/").filter(Boolean)[0];
          return handle ? `[🟣 @${handle} on Farcaster](${match})` : `[Farcaster](${match})`;
        }
        if (host === "farcaster.xyz") return `[Farcaster Channel](${match})`;
        if (host === "youtube.com" || host === "youtu.be") return `[YouTube](${match})`;
        if (host === "thewipmeetup.com") return `[The WIP Meetup](${match})`;
        return `[${host}${path || ""}](${match})`;
      } catch {
        return `[Link](${match})`;
      }
    }
  );

  // Ensure images are on their own lines
  cleaned = cleaned.replace(
    /([^\n])(!\[[^\]]*\]\([^)]+\))/g,
    "$1\n\n$2"
  ).replace(
    /(!\[[^\]]*\]\([^)]+\))([^\n])/g,
    "$1\n\n$2"
  );

  // Ensure headings have blank lines around them
  cleaned = cleaned.replace(
    /([^\n])\n(#{1,6}\s)/g,
    "$1\n\n$2"
  ).replace(
    /(#{1,6}\s[^\n]+)\n([^\n#-])/g,
    "$1\n\n$2"
  );

  // Ensure --- has blank lines around it
  cleaned = cleaned.replace(
    /([^\n])\n(---)/g,
    "$1\n\n$2"
  ).replace(
    /(---)\n([^\n])/g,
    "$1\n\n$2"
  );

  // ── DEDUPLICATE repeated link blocks (double tabs fix) ──
  // Detect and remove duplicate community link sections
  const linkPatterns = [
    /\[Join Discord\]\([^)]+\)/g,
    /\[Follow on (?:𝕏|X)\s*(?:\/\s*Twitter)?\]\([^)]+\)/g,
    /\[Subscribe on YouTube\]\([^)]+\)/g,
    /\[(?:Join )?Farcaster(?: Channel)?\]\([^)]+\)/g,
    /\[(?:Explore (?:the )?)?(?:The WIP Meetup|Website)\]\([^)]+\)/g,
  ];
  
  for (const pattern of linkPatterns) {
    const matches = cleaned.match(pattern);
    if (matches && matches.length > 1) {
      // Keep only the first occurrence of each duplicate link
      let seen = false;
      cleaned = cleaned.replace(pattern, (m) => {
        if (!seen) { seen = true; return m; }
        return "";
      });
    }
  }

  // Collapse 3+ newlines to exactly 2
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  return cleaned;
}

export function SubstackExportModal({ open, onOpenChange, markdown, html, title }: SubstackExportModalProps) {
  const [copied, setCopied] = useState(false);
  const [capturingImage, setCapturingImage] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);
  const exportedMarkdown = convertToSubstackMarkdown(markdown, html);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportedMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = exportedMarkdown;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyImage = async () => {
    const posterEl = document.querySelector(".newsletter-poster-preview") as HTMLElement | null;
    if (!posterEl) {
      alert("No newsletter content found to capture.");
      return;
    }

    setCapturingImage(true);
    try {
      // Clone the poster element so we can modify it without affecting the page
      const clone = posterEl.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      clone.style.top = "0";
      clone.style.width = posterEl.offsetWidth + "px";
      // Remove any max-height / overflow constraints that could crop
      clone.style.maxHeight = "none";
      clone.style.overflow = "visible";
      clone.style.height = "auto";
      document.body.appendChild(clone);

      // Swap all GIF logos to static PNG in the clone
      const logoImgs = clone.querySelectorAll<HTMLImageElement>("img");
      const loadPromises: Promise<void>[] = [];

      logoImgs.forEach((img) => {
        const src = img.getAttribute("src") || "";
        if (/wip-logo\.gif/i.test(src) || (/wip-logo/i.test(src) && src.endsWith(".gif"))) {
          // Replace GIF with static PNG
          img.src = "/images/wip-logo-static.png";
          // Remove onerror handler that might interfere
          img.removeAttribute("onerror");
          // Wait for the static image to load
          loadPromises.push(
            new Promise<void>((resolve) => {
              if (img.complete && img.naturalWidth > 0) {
                resolve();
              } else {
                img.onload = () => resolve();
                img.onerror = () => {
                  // Use the SVG fallback if static PNG also fails
                  img.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='16' fill='%230a0612'/%3E%3Crect x='2' y='2' width='76' height='76' rx='14' fill='none' stroke='%23e84393' stroke-width='3'/%3E%3Ctext x='40' y='48' font-family='Arial,sans-serif' font-size='28' font-weight='bold' fill='%23f5f0e8' text-anchor='middle'%3EWIP%3C/text%3E%3C/svg%3E`;
                  resolve();
                };
              }
            })
          );
        }
      });

      // Wait for all replacement images to load
      if (loadPromises.length > 0) {
        await Promise.all(loadPromises);
        // Small extra delay for rendering
        await new Promise((r) => setTimeout(r, 200));
      }

      const canvas = await html2canvas(clone, {
        backgroundColor: "#0a0612",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        // Capture the full scrollable height
        height: clone.scrollHeight,
        windowHeight: clone.scrollHeight,
        width: clone.offsetWidth,
        windowWidth: clone.offsetWidth,
      });

      // Clean up clone
      document.body.removeChild(clone);

      // Convert to blob and copy/download
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setCapturingImage(false);
          return;
        }

        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setImageCopied(true);
          setTimeout(() => setImageCopied(false), 2500);
        } catch {
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "wip-newsletter";
          a.download = `${slug}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setImageCopied(true);
          setTimeout(() => setImageCopied(false), 2500);
        }

        setCapturingImage(false);
      }, "image/png");
    } catch (err) {
      console.error("Image capture failed:", err);
      setCapturingImage(false);
    }
  };

  const lineCount = exportedMarkdown.split("\n").length;
  const wordCount = exportedMarkdown.split(/\s+/).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-accent" />
            Export to Substack
          </DialogTitle>
          <DialogDescription>
            Clean markdown ready for Substack. Copy it, then paste directly into the Substack editor.
          </DialogDescription>
        </DialogHeader>

        {/* Stats bar */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-b border-border pb-2">
          <span>{wordCount} words</span>
          <span>{lineCount} lines</span>
        </div>

        {/* Markdown preview */}
        <div ref={previewRef} className="flex-1 overflow-auto min-h-0">
          <pre className="text-xs font-mono whitespace-pre-wrap bg-card border border-border rounded-lg p-4 max-h-[50vh] overflow-auto text-foreground leading-relaxed">
            {exportedMarkdown || "No content to export."}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between pt-2 border-t border-border">
          <div className="flex gap-2">
            <Button onClick={handleCopy} variant={copied ? "default" : "outline"} size="sm">
              {copied ? (
                <><CheckCircle2 className="w-4 h-4" /> Copied!</>
              ) : (
                <><Copy className="w-4 h-4" /> Copy Text</>
              )}
            </Button>
            <Button
              onClick={handleCopyImage}
              variant={imageCopied ? "default" : "outline"}
              size="sm"
              disabled={capturingImage}
            >
              {capturingImage ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Capturing…</>
              ) : imageCopied ? (
                <><CheckCircle2 className="w-4 h-4" /> Image Copied!</>
              ) : (
                <><ImageIcon className="w-4 h-4" /> Copy Image</>
              )}
            </Button>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              handleCopy();
              window.open("https://thewipmeetup.substack.com/publish/post", "_blank");
            }}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <ExternalLink className="w-4 h-4" />
            Copy & Open Substack
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
