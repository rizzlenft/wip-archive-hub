import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "./_cors.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end("Method Not Allowed");
  }

  const cookieDomain = process.env.COOKIE_DOMAIN;
  const cookie = [
    "jwt=",
    "Path=/",
    "HttpOnly",
    "SameSite=None",
    "Secure",
    cookieDomain ? `Domain=${cookieDomain}` : "",
    "Max-Age=0",
  ]
    .filter(Boolean)
    .join("; ");

  const appUrl = process.env.APP_URL || "";
  const redirectTo = appUrl ? `${appUrl}/login?logout=true` : "/login?logout=true";

  res.writeHead(302, {
    "Set-Cookie": cookie,
    Location: redirectTo,
  }).end();
}

