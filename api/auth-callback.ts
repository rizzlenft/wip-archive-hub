import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "../api-lib/_cors.js";

const TOKENSMART_URL =
  process.env.TOKENSMART_URL || "https://www.tokensmart.co";
const CLIENT_ID = process.env.CONNECT_CLIENT_ID;
const CLIENT_SECRET = process.env.CONNECT_CLIENT_SECRET;
const APP_URL = process.env.APP_URL;

function loginErrorUrl(error: string): string {
  // For access_denied (user declined), send them to the main site
  if (error === "access_denied") {
    return process.env.APP_URL || "https://thewipmeetup.com";
  }
  const base = process.env.APP_URL || "";
  const path = `/login?error=${encodeURIComponent(error)}`;
  return base ? `${base}${path}` : path;
}

function safeRedirect(res: VercelResponse, url: string, cookie?: string): void {
  const headers: Record<string, string> = { Location: url };
  if (cookie) {
    headers["Set-Cookie"] = cookie;
  }
  res.writeHead(302, headers).end();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    setCorsHeaders(res, req);

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).end("Method Not Allowed");
    }

    const { code, state, error } = req.query;

    if (error) {
      return safeRedirect(res, loginErrorUrl("access_denied"));
    }
    if (!code || typeof code !== "string") {
      return safeRedirect(res, loginErrorUrl("missing_code"));
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error(
        "Missing CONNECT_CLIENT_ID or CONNECT_CLIENT_SECRET in environment",
      );
      return safeRedirect(res, loginErrorUrl("server_config"));
    }

    const host =
      (req.headers["x-forwarded-host"] as string | undefined) ||
      (req.headers.host as string | undefined);
    const protoHeader =
      (req.headers["x-forwarded-proto"] as string | undefined) || "https";
    const baseUrl = host ? `${protoHeader}://${host}` : "";
    const redirectUri = `${baseUrl}/api/auth-callback`;

    const tokenRes = await fetch(`${TOKENSMART_URL}/api/connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      let body: Record<string, unknown> = {};
      try {
        body = (await tokenRes.json()) as Record<string, unknown>;
      } catch {
        // ignore
      }
      console.error("Token exchange failed:", body);

      const errorCode =
        typeof body.error === "string" ? body.error : undefined;

      if (errorCode === "invalid_grant") {
        return safeRedirect(res, loginErrorUrl("code_used"));
      }

      return safeRedirect(res, loginErrorUrl("token_exchange_failed"));
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const access_token = tokenData?.access_token;
    if (!access_token) {
      console.error("Token response missing access_token", tokenData);
      return safeRedirect(res, loginErrorUrl("token_exchange_failed"));
    }

    const intended =
      typeof state === "string" && state.length > 0
        ? decodeURIComponent(state)
        : "/";
    const safePath =
      typeof intended === "string" && intended.startsWith("/") ? intended : "/";

    const cookieDomain = process.env.COOKIE_DOMAIN; // e.g. .thewipmeetup.com
    // 30 days — keeps users signed in across visits instead of forcing
    // a TokenSmart re-auth every hour.
    const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
    const cookie = [
      `jwt=${access_token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=None",
      "Secure",
      cookieDomain ? `Domain=${cookieDomain}` : "",
      `Max-Age=${COOKIE_MAX_AGE}`,
    ]
      .filter(Boolean)
      .join("; ");

    const appBase = APP_URL || baseUrl;
    const targetUrl = `${appBase}${safePath}`;
    return safeRedirect(res, targetUrl, cookie);
  } catch (err) {
    console.error("Auth callback error:", err);
    try {
      safeRedirect(res, loginErrorUrl("callback_exception"));
    } catch {
      res.status(500).end("Auth callback failed");
    }
  }
}

