import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, CheckCircle2, ExternalLink } from "lucide-react";

interface SubstackExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  markdown: string;
  html: string;
  title: string;
}

/**
 * Convert newsletter HTML/markdown into clean Substack-compatible markdown.
 *
 * Substack reliably supports:
 *   # ## ### headings, paragraphs, [link](url), ![alt](url), ---, blank lines
 *
 * NOT supported: HTML tags, CSS, tables, inline styles, nested formatting
 */
function convertToSubstackMarkdown(rawMarkdown: string, rawHtml: string): string {
  // Prefer the markdown source; fall back to stripping HTML
  let source = rawMarkdown?.trim() || "";

  if (!source && rawHtml) {
    // Basic HTML→text fallback
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

  const cleaned = source
    // Remove any lingering HTML/CSS/script blocks
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+>/g, "")
    // Remove table markup
    .replace(/^\s*\|.*\|\s*$/gm, "")
    .replace(/^\s*[-:]+\s*\|.*$/gm, "")
    // Remove image placeholders
    .replace(/\[PROFILE IMAGE:[^\]]+\]/gi, "")
    .replace(/\[from X\/Twitter\]\s*/gi, "")
    // Trim trailing whitespace per line
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  // Ensure images are on their own lines
  const withImages = cleaned.replace(
    /([^\n])(!\[[^\]]*\]\([^)]+\))/g,
    "$1\n\n$2"
  ).replace(
    /(!\[[^\]]*\]\([^)]+\))([^\n])/g,
    "$1\n\n$2"
  );

  // Ensure headings have blank lines around them
  const withHeadings = withImages.replace(
    /([^\n])\n(#{1,6}\s)/g,
    "$1\n\n$2"
  ).replace(
    /(#{1,6}\s[^\n]+)\n([^\n#-])/g,
    "$1\n\n$2"
  );

  // Ensure --- has blank lines around it
  const withRules = withHeadings.replace(
    /([^\n])\n(---)/g,
    "$1\n\n$2"
  ).replace(
    /(---)\n([^\n])/g,
    "$1\n\n$2"
  );

  // Ensure consecutive links are separated
  const withLinks = withRules.replace(
    /(\[[^\]]+\]\([^)]+\))(?:\s+)(?=\[[^\]]+\]\([^)]+\))/g,
    "$1\n\n"
  );

  // Collapse 3+ newlines to exactly 2
  const final = withLinks
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return final;
}

export function SubstackExportModal({ open, onOpenChange, markdown, html, title }: SubstackExportModalProps) {
  const [copied, setCopied] = useState(false);
  const exportedMarkdown = convertToSubstackMarkdown(markdown, html);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportedMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
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

  const handleDownload = () => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      || "wip-meetup-newsletter";
    const filename = `${slug}-substack.md`;
    const blob = new Blob([exportedMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        <div className="flex-1 overflow-auto min-h-0">
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
                <><Copy className="w-4 h-4" /> Copy to Clipboard</>
              )}
            </Button>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="w-4 h-4" />
              Download .md
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
