import type { VercelRequest, VercelResponse } from "@vercel/node";
import fetch from "node-fetch";
import { setCorsHeaders } from "./_cors";

const TOKENSMART_URL =
  process.env.TOKENSMART_URL || "https://www.tokensmart.co";
const CLIENT_ID = process.env.CONNECT_CLIENT_ID;
const CLIENT_SECRET = process.env.CONNECT_CLIENT_SECRET;
const APP_URL = process.env.APP_URL;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/login?error=access_denied`);
  }
  if (!code || typeof code !== "string") {
    return res.redirect(`/login?error=missing_code`);
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error(
      "Missing CONNECT_CLIENT_ID or CONNECT_CLIENT_SECRET in environment",
    );
    return res.redirect(`/login?error=server_config`);
  }

  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ||
    (req.headers.host as string | undefined);
  const protoHeader =
    (req.headers["x-forwarded-proto"] as string | undefined) || "https";
  const baseUrl = host ? `${protoHeader}://${host}` : "";
  const redirectUri = `${baseUrl}/api/auth-callback`;

  try {
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
        return res.redirect(`/login?error=code_used`);
      }

      return res.redirect(`/login?error=token_exchange_failed`);
    }

    const { access_token } = (await tokenRes.json()) as {
      access_token: string;
    };

    const intended =
      typeof state === "string" && state.length > 0
        ? decodeURIComponent(state)
        : "/";
    const safePath =
      typeof intended === "string" && intended.startsWith("/") ? intended : "/";

    const secure = process.env.NODE_ENV === "production";
    const cookie = [
      `jwt=${access_token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      secure ? "Secure" : "",
      "Max-Age=3600",
    ]
      .filter(Boolean)
      .join("; ");

    res.setHeader("Set-Cookie", cookie);

    const appBase = APP_URL || baseUrl;
    const targetUrl = `${appBase}${safePath}`;
    return res.redirect(targetUrl);
  } catch (err) {
    console.error("Auth callback error:", err);
    return res.redirect(`/login?error=callback_exception`);
  }
}

