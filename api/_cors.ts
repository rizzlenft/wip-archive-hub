import type { VercelResponse } from "@vercel/node";

const ALLOWED_ORIGIN =
  process.env.APP_URL || process.env.FRONTEND_ORIGIN || "*";

/**
 * Set CORS headers so the frontend (e.g. thewipmeetup.com) can call this API from another origin.
 * Call this before sending the response in any API route the frontend fetches.
 */
export function setCorsHeaders(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
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
