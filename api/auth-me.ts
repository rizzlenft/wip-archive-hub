import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getConnectUserFromRequest } from "./connect-verify";
import { setCorsHeaders } from "./_cors";

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

  try {
    const user = await getConnectUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ authenticated: false });
    }
    return res.status(200).json({ authenticated: true, user });
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

