import type { VercelRequest } from "@vercel/node";

export function parseCookies(req: VercelRequest): Record<string, string> {
  const cookieHeader = req.headers.cookie ?? "";
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((part) => {
    const [name, ...rest] = part.split("=");
    if (!name || !rest.length) return;
    cookies[name.trim()] = decodeURIComponent(rest.join("="));
  });
  return cookies;
}

export function getJwtCookie(req: VercelRequest): string | undefined {
  return parseCookies(req).jwt;
}
