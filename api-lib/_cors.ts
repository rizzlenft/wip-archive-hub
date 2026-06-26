import type { VercelRequest, VercelResponse } from "@vercel/node";

const PRODUCTION_ORIGINS = [
  process.env.APP_URL || "https://thewipmeetup.com",
  "https://www.thewipmeetup.com",
];

const DEV_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
];

function isAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) return PRODUCTION_ORIGINS[0];
  if (PRODUCTION_ORIGINS.includes(origin) || DEV_ORIGINS.includes(origin)) {
    return origin;
  }
  return null;
}

/**
 * Set CORS headers so the frontend can call this API from allowed origins.
 */
export function setCorsHeaders(res: VercelResponse, req?: VercelRequest): void {
  const origin = req?.headers?.origin as string | undefined;
  const allowed = isAllowedOrigin(origin) || PRODUCTION_ORIGINS[0];
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
