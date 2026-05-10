import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getConnectUserFromRequest } from "../api-shared/_connect-verify.js";
import { setCorsHeaders } from "../api-shared/_cors.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const user = await getConnectUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ authenticated: false });
    }

    // Optionally enrich with wallets from TokenSmart userinfo
    const cookieHeader = req.headers.cookie ?? "";
    const cookies: Record<string, string> = {};
    cookieHeader.split(";").forEach((part) => {
      const [name, ...rest] = part.split("=");
      if (!name || !rest.length) return;
      cookies[name.trim()] = decodeURIComponent(rest.join("="));
    });
    const token = cookies.jwt;

    let ethAddress: string | undefined;
    if (token) {
      const base =
        process.env.TOKENSMART_URL ||
        process.env.NEXT_PUBLIC_TOKENSMART_URL ||
        "https://www.tokensmart.co";
      try {
        const profileRes = await fetch(`${base}/api/connect/userinfo`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (profileRes.ok) {
          const profile = (await profileRes.json()) as {
            wallet?: string;
            wallets?: string[];
          };
          if (typeof profile.wallet === "string") {
            ethAddress = profile.wallet;
          } else if (
            Array.isArray(profile.wallets) &&
            typeof profile.wallets[0] === "string"
          ) {
            ethAddress = profile.wallets[0];
          }
        }
      } catch {
        // ignore profile failures; auth still works
      }
    }

    return res.status(200).json({
      authenticated: true,
      user: ethAddress ? { ...user, ethAddress } : user,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (
      message.includes("CONNECT_JWT_SECRET") ||
      message.includes("JWT_SECRET")
    ) {
      console.error("auth-me: missing or invalid CONNECT_JWT_SECRET", message);
      return res.status(503).json({
        authenticated: false,
        error: "server_config",
        message:
          "CONNECT_JWT_SECRET not set or too short (min 32 chars). Add it in Vercel env.",
      });
    }
    console.error("auth-me error:", err);
    return res.status(500).json({ authenticated: false });
  }
}

