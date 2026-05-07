import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "../api-shared/_cors.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end("Method Not Allowed");
  }

  const cookieDomain = process.env.COOKIE_DOMAIN; // e.g. .thewipmeetup.com

  // Clear the cookie with AND without Domain to cover all cases.
  const cookieAttrs = "Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0";
  const cookies: string[] = [];
  cookies.push(`jwt=; ${cookieAttrs}`);
  if (cookieDomain) {
    cookies.push(`jwt=; ${cookieAttrs}; Domain=${cookieDomain}`);
  }

  const appUrl = process.env.APP_URL || "";
  const redirectTo = appUrl
    ? `${appUrl}/login?logout=true`
    : "/login?logout=true";

  res.writeHead(302, {
    "Set-Cookie": cookies,
    Location: redirectTo,
  }).end();
}

