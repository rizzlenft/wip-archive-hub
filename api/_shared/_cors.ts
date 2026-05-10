import type { VercelRequest, VercelResponse } from "@vercel/node";

const ALLOWED_ORIGINS = [
  process.env.APP_URL || "https://thewipmeetup.com",
  "https://wip-archive-hub.lovable.app",
];

// Also allow any *.lovableproject.com or *.lovable.app preview origins
function isAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) return ALLOWED_ORIGINS[0];
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (origin.endsWith(".lovableproject.com") || origin.endsWith(".lovable.app")) return origin;
  return null;
}

/**
 * Set CORS headers so the frontend can call this API from allowed origins.
 */
export function setCorsHeaders(res: VercelResponse, req?: VercelRequest): void {
  const origin = req?.headers?.origin as string | undefined;
  const allowed = isAllowedOrigin(origin) || ALLOWED_ORIGINS[0];
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key",
  );
}
