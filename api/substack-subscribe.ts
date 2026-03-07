import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "./_cors.js";

const SUBSTACK_SUBSCRIBE_URL =
  "https://thewipmeetup.substack.com/api/v1/free?noRedirect=true";

function parseEmail(body: unknown): string {
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as { email?: unknown };
      return typeof parsed.email === "string" ? parsed.email.trim() : "";
    } catch {
      return "";
    }
  }

  if (body && typeof body === "object" && "email" in body) {
    const email = (body as { email?: unknown }).email;
    return typeof email === "string" ? email.trim() : "";
  }

  return "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const email = parseEmail(req.body);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }

  try {
    const substackRes = await fetch(SUBSTACK_SUBSCRIBE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_url: "https://thewipmeetup.substack.com/",
        first_referrer: "",
        current_url: "https://thewipmeetup.substack.com/",
        current_referrer: "https://thewipmeetup.com",
        referral_code: "",
        source: "embed",
        email,
      }),
    });

    const responseBody = await substackRes.text().catch(() => "");

    if (!substackRes.ok) {
      const lowerBody = responseBody.toLowerCase();
      if (
        lowerBody.includes("already") &&
        (lowerBody.includes("subscribed") || lowerBody.includes("subscriber"))
      ) {
        return res.status(200).json({ success: true, alreadySubscribed: true });
      }

      console.error("Substack subscribe failed:", substackRes.status, responseBody);
      return res.status(502).json({ error: "Subscription failed. Please try again." });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Substack subscribe error:", err);
    return res.status(500).json({ error: "Internal subscribe error" });
  }
}
