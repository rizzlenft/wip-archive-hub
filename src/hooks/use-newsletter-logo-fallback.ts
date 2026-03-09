import { useEffect } from "react";

const WIP_LOGO_FALLBACK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='16' fill='%230a0612'/%3E%3Crect x='2' y='2' width='76' height='76' rx='14' fill='none' stroke='%23e84393' stroke-width='3'/%3E%3Ctext x='40' y='48' font-family='Arial,sans-serif' font-size='28' font-weight='bold' fill='%23f5f0e8' text-anchor='middle'%3EWIP%3C/text%3E%3C/svg%3E`;

/**
 * After dangerouslySetInnerHTML renders, find any broken WIP logo images
 * inside the given container ref and swap them to an inline SVG fallback.
 * (React strips inline onerror handlers from innerHTML, so we do it via JS.)
 */
export function useNewsletterLogoFallback(
  containerRef: React.RefObject<HTMLElement | null>,
  htmlContent: string,
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const imgs = el.querySelectorAll<HTMLImageElement>("img");
    imgs.forEach((img) => {
      const src = img.src || "";
      const alt = (img.alt || "").toLowerCase();
      const isLogo =
        /wip-logo|wip-archive-hub\.lovable|thewipmeetup\.com\/images/i.test(src) ||
        (alt === "wip" && img.width <= 120);

      if (!isLogo) return;

      // If already failed or will fail, swap immediately or attach handler
      if (img.complete && img.naturalWidth === 0) {
        img.src = decodeURIComponent(WIP_LOGO_FALLBACK);
      } else {
        img.onerror = () => {
          img.onerror = null;
          img.src = decodeURIComponent(WIP_LOGO_FALLBACK);
        };
      }
    });
  }, [htmlContent, containerRef]);
}
