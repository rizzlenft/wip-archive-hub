import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getConnectUserFromRequest } from "./_shared/_connect-verify.js";
import { setCorsHeaders } from "./_shared/_cors.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  setCorsHeaders(res, req);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const base =
    process.env.TOKENSMART_URL ||
    process.env.NEXT_PUBLIC_TOKENSMART_URL ||
    "https://www.tokensmart.co";

  // GET: check if event is in check-in window (no auth)
  if (req.method === "GET") {
    const eventId = req.query.eventId as string;
    if (!eventId) {
      return res.status(400).json({ error: "eventId required" });
    }
    try {
      const tsRes = await fetch(
        `${base}/api/events/check-in/${encodeURIComponent(eventId)}`,
      );
      if (!tsRes.ok) {
        return res.status(tsRes.status).json({
          check_in_available: false,
          error: await tsRes.text().catch(() => "Unknown"),
        });
      }
      const data = (await tsRes.json()) as {
        check_in_available?: boolean;
        scheduled_start?: string;
        scheduled_end?: string;
      };
      return res.status(200).json({
        check_in_available: data.check_in_available ?? false,
        scheduled_start: data.scheduled_start,
        scheduled_end: data.scheduled_end,
      });
    } catch (err) {
      console.error("events-check-in error", err);
      return res.status(500).json({ check_in_available: false });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end("Method Not Allowed");
  }

  const user = await getConnectUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const cookieHeader = req.headers.cookie ?? "";
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((part) => {
    const [name, ...rest] = part.split("=");
    if (!name || !rest.length) return;
    cookies[name.trim()] = decodeURIComponent(rest.join("="));
  });
  const token = cookies.jwt;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const body = (req.body || {}) as {
    eventId?: string;
    ethAddress?: string;
    handle?: string;
  };
  const { eventId, ethAddress, handle } = body;

  if (!eventId) {
    return res.status(400).json({ error: "eventId is required" });
  }

  const apiKey =
    process.env.CONNECT_API_KEY || process.env.CONNECT_CLIENT_SECRET;
  // base is declared above for both GET and POST

  if (!apiKey) {
    console.error("CONNECT_API_KEY or CONNECT_CLIENT_SECRET not set");
    return res.status(500).json({
      success: false,
      error:
        "Check-in unavailable: set CONNECT_API_KEY (or CONNECT_CLIENT_SECRET) in server env.",
    });
  }

  try {
    const payload: Record<string, unknown> = {};
    const bodyToSend: Record<string, unknown> = { event_id: eventId };

    if (ethAddress?.trim()) {
      const wallet = ethAddress.trim();
      payload.wallet_address = wallet;
      bodyToSend.wallet_address = wallet;
    }
    if (handle?.trim()) {
      payload.handle = handle.trim();
    }
    if (Object.keys(payload).length > 0) {
      bodyToSend.payload = payload;
    }

    const tsRes = await fetch(`${base}/api/connect/check-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(bodyToSend),
    });

    const data = (await tsRes.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    if (!tsRes.ok) {
      if (tsRes.status === 403) {
        return res.status(403).json({
          success: false,
          error: data.error ?? "Check-in is only available while the event is live.",
        });
      }
      if (tsRes.status === 401) {
        return res.status(401).json({
          success: false,
          error: data.error ?? "Not authorized",
        });
      }
      if (tsRes.status === 404) {
        return res.status(404).json({
          success: false,
          error: data.error ?? "Event not found",
        });
      }
      return res.status(tsRes.status).json({
        success: false,
        error: data.error ?? data.message ?? "Check-in failed",
      });
    }

    return res.status(200).json({ success: true, eventId });
  } catch (err) {
    console.error("events/checkin error:", err);
    return res.status(500).json({ success: false, error: "Failed to check in" });
  }
}

