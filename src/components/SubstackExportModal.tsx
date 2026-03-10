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
  // Match URLs that are NOT preceded by ]( or "( and NOT already inside a markdown link
  cleaned = cleaned.replace(
    /(?<!\]\()(?<!\()(https?:\/\/[^\s)\]]+)/g,
    (match, _url, offset, full) => {
      // Check if this URL is already part of a markdown link [text](url) or ![alt](url)
      const before = full.substring(Math.max(0, offset - 2), offset);
      if (before.endsWith("](") || before.endsWith("!(")) return match;
      
      // Check if this URL is the href inside [text](URL) — look backwards for ](
      const preceding = full.substring(Math.max(0, offset - 200), offset);
      const lastOpenParen = preceding.lastIndexOf("](");
      if (lastOpenParen !== -1) {
        const between = preceding.substring(lastOpenParen + 2);
        // If there's no closing paren between ]( and this URL, it's inside a link
        if (!between.includes(")")) return match;
      }

      // Generate a readable label from the URL
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
    // Find the newsletter poster element on the page behind the modal
    const posterEl = document.querySelector(".newsletter-poster-preview") as HTMLElement | null;
    if (!posterEl) {
      alert("No newsletter content found to capture.");
      return;
    }

    setCapturingImage(true);
    try {
      const canvas = await html2canvas(posterEl, {
        backgroundColor: "#0a0612",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      // Try clipboard API first
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
