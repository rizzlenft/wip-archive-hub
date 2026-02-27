import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getConnectUserFromRequest } from "./connect-verify";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const user = await getConnectUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const body = (req.body || {}) as { eventId?: string };
  const eventId = body.eventId;

  if (!eventId) {
    return res.status(400).json({ error: "eventId is required" });
  }

  try {
    // In the future, call the real TokenSmart event check-in API here.
    return res.status(200).json({
      success: true,
      eventId,
      message:
        "Stubbed check-in; connect to TokenSmart event API with your partner spec.",
    });
  } catch (err) {
    console.error("events/checkin error:", err);
    return res.status(500).json({ error: "Failed to check in" });
  }
}

