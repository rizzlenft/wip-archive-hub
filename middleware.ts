import { NextRequest, NextResponse } from "next/server";

/**
 * Vercel Edge Middleware — detects social media crawlers requesting
 * /newsletter?issue=ID and rewrites them to /api/og-newsletter so they
 * receive proper OG meta tags. Regular users get the normal SPA.
 */

const BOT_PATTERNS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "Slackbot",
  "TelegramBot",
  "WhatsApp",
  "Discordbot",
  "Googlebot",
  "bingbot",
  "Applebot",
  "redditbot",
  "Embedly",
  "Quora Link Preview",
  "Showyoubot",
  "outbrain",
  "pinterest",
  "vkShare",
  "W3C_Validator",
  "Iframely",
];

const BOT_REGEX = new RegExp(BOT_PATTERNS.join("|"), "i");

export const config = {
  matcher: "/newsletter",
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const issueId = url.searchParams.get("issue");

  // Only intercept if there's an issue param and the UA is a known crawler
  if (!issueId) return NextResponse.next();

  const ua = req.headers.get("user-agent") || "";
  if (!BOT_REGEX.test(ua)) return NextResponse.next();

  // Rewrite to the OG meta endpoint (invisible to the client)
  const ogUrl = new URL(`/api/og-newsletter`, req.url);
  ogUrl.searchParams.set("id", issueId);
  return NextResponse.rewrite(ogUrl);
}
