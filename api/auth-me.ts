import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getConnectUserFromRequest } from "./connect-verify";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const user = await getConnectUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ authenticated: false });
  }

  return res.status(200).json({ authenticated: true, user });
}

