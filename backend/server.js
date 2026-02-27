import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fetch from "node-fetch";
import {
  getConnectUserFromRequest,
  verifyConnectJwt,
} from "./connect-verify.js";

const app = express();
const PORT = process.env.PORT || 4000;

const APP_URL = process.env.APP_URL || "http://localhost:8080";
const TOKENSMART_URL =
  process.env.TOKENSMART_URL || "https://www.tokensmart.co";
const CLIENT_ID = process.env.CONNECT_CLIENT_ID;
const CLIENT_SECRET = process.env.CONNECT_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn(
    "CONNECT_CLIENT_ID or CONNECT_CLIENT_SECRET missing; auth will fail.",
  );
}

app.use(
  cors({
    origin: APP_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Auth callback from TokenSmart: /api/auth-callback?code=...&state=...&error=...
app.get("/api/auth-callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${APP_URL}/login?error=access_denied`);
  }
  if (!code) {
    return res.redirect(`${APP_URL}/login?error=missing_code`);
  }

  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth-callback`;

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
      let body = {};
      try {
        body = await tokenRes.json();
      } catch {
        // ignore
      }
      console.error("Token exchange failed:", body);

      if (body?.error === "invalid_grant") {
        return res.redirect(`${APP_URL}/login?error=code_used`);
      }

      return res.redirect(`${APP_URL}/login?error=token_exchange_failed`);
    }

    const { access_token } = await tokenRes.json();

    const intended = state ? decodeURIComponent(state) : "/";
    const safePath =
      typeof intended === "string" && intended.startsWith("/") ? intended : "/";
    const targetUrl = `${APP_URL}${safePath}`;

    // Set jwt cookie (HTTP-only)
    res.cookie("jwt", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    return res.redirect(targetUrl);
  } catch (err) {
    console.error("Auth callback error:", err);
    return res.redirect(`${APP_URL}/login?error=server_error`);
  }
});

// Current user
app.get("/api/auth-me", async (req, res) => {
  const user = await getConnectUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ authenticated: false });
  }
  return res.json({ authenticated: true, user });
});

// Logout (clear cookie)
app.post("/api/auth-logout", (req, res) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return res.status(204).end();
});

// Auth middleware for events
async function requireAuth(req, res, next) {
  const user = await getConnectUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  req.user = user;
  next();
}

// Get aggregated check-ins and upcoming events for current user
app.get("/api/events-checkins", requireAuth, async (req, res) => {
  const token = req.cookies.jwt;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const base =
    process.env.TOKENSMART_URL ||
    process.env.NEXT_PUBLIC_TOKENSMART_URL ||
    "https://www.tokensmart.co";

  try {
    const tsRes = await fetch(`${base}/api/connect/user-events`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!tsRes.ok) {
      let body = {};
      try {
        body = await tsRes.json();
      } catch {
        // ignore
      }
      console.error("user-events error", tsRes.status, body);
      return res
        .status(502)
        .json({ error: true, message: "Failed to load events" });
    }

    const data = await tsRes.json();

    return res.json({
      user: data.user || req.user,
      checkins: data.checkins || [],
      upcomingEvents: data.upcoming_events || [],
    });
  } catch (err) {
    console.error("events/checkins error:", err);
    return res.status(500).json({ error: "Failed to fetch checkins" });
  }
});

// Upcoming events for this user (wrapper)
app.get("/api/events-upcoming", requireAuth, async (req, res) => {
  const token = req.cookies.jwt;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const origin = APP_URL || "";

  try {
    const eventsRes = await fetch(`${origin}/api/events-checkins`, {
      headers: {
        Cookie: `jwt=${encodeURIComponent(token)}`,
      },
    });

    if (!eventsRes.ok) {
      return res
        .status(502)
        .json({ error: true, message: "Failed to load upcoming events" });
    }

    const data = await eventsRes.json();

    return res.json({ upcomingEvents: data.upcomingEvents || [] });
  } catch (err) {
    console.error("events-upcoming error:", err);
    return res.status(500).json({ error: "Failed to fetch upcoming events" });
  }
});

// Check in to an event (stub)
app.post("/api/events-checkin", requireAuth, async (req, res) => {
  const { eventId } = req.body || {};
  if (!eventId) {
    return res.status(400).json({ error: "eventId is required" });
  }

  try {
    // const jwt = req.cookies.jwt;
    // Call your real TokenSmart event check-in endpoint here.
    return res.json({
      success: true,
      eventId,
      message:
        "Stubbed check-in; connect to TokenSmart event API with your spec.",
    });
  } catch (err) {
    console.error("events/checkin error:", err);
    return res.status(500).json({ error: "Failed to check in" });
  }
});

app.listen(PORT, () => {
  console.log(`TokenSmart backend listening on http://localhost:${PORT}`);
});

