import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCorsHeaders } from "./_cors.js";

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

  const { email } = (req.body ?? {}) as { email?: string };
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Valid email required" });
  }

  try {
    const substackRes = await fetch(
      "https://thewipmeetup.substack.com/api/v1/free?noRedirect=true",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_url: "https://thewipmeetup.substack.com/",
          first_referrer: "",
          current_url: "https://thewipmeetup.substack.com/",
          current_referrer: "https://thewipmeetup.com",
          referral_code: "",
          source: "embed",
          email: email.trim(),
        }),
      },
    );

    if (!substackRes.ok) {
      const body = await substackRes.text().catch(() => "");
      console.error("Substack subscribe failed:", substackRes.status, body);
      return res.status(502).json({ error: "Subscribe failed" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Substack subscribe error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
