import { useEffect } from "react";

const WIP_LOGO_FALLBACK_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><rect width='80' height='80' rx='16' fill='#0a0612'/><rect x='2' y='2' width='76' height='76' rx='14' fill='none' stroke='#e84393' stroke-width='3'/><text x='40' y='48' font-family='Arial,sans-serif' font-size='28' font-weight='bold' fill='#f5f0e8' text-anchor='middle'>WIP</text></svg>`;

const WIP_LOGO_FALLBACK_DATA_URI = `data:image/svg+xml;base64,${btoa(WIP_LOGO_FALLBACK_SVG)}`;

function isWipLogo(img: HTMLImageElement): boolean {
  const src = (img.getAttribute("src") || "").toLowerCase();
  const alt = (img.getAttribute("alt") || "").toLowerCase().trim();
  return (
    /wip-logo|wip-archive-hub\.lovable|thewipmeetup\.com\/images/i.test(src) ||
    (alt === "wip" && !src.includes("avatar") && !src.includes("pfp"))
  );
}

function patchImage(img: HTMLImageElement) {
  if (img.dataset.logoPatchApplied) return;
  img.dataset.logoPatchApplied = "1";

  const swap = () => {
    img.src = WIP_LOGO_FALLBACK_DATA_URI;
  };

  // If already errored (complete but no natural dimensions)
  if (img.complete && img.naturalWidth === 0) {
    swap();
    return;
  }

  img.addEventListener("error", swap, { once: true });
}

/**
 * After dangerouslySetInnerHTML renders, find any WIP logo images
 * and attach error handlers to swap to an inline SVG fallback.
 */
export function useNewsletterLogoFallback(
  containerRef: React.RefObject<HTMLElement | null>,
  htmlContent: string,
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Patch all current images
    el.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      if (isWipLogo(img)) patchImage(img);
    });

    // Also observe for dynamically added images
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLImageElement && isWipLogo(node)) {
            patchImage(node);
          }
          if (node instanceof HTMLElement) {
            node.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
              if (isWipLogo(img)) patchImage(img);
            });
          }
        });
      }
    });
    observer.observe(el, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [htmlContent, containerRef]);
}
