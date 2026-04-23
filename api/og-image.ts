import { ImageResponse } from "@vercel/og";
import { Redis } from "@upstash/redis";

export const config = { runtime: "edge" };

const WIP_LOGO_URL =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/DM2lONnsGyMlKagJreu03ZO2vI43/uploads/1770403228998-wip_logo.gif";

interface Speaker {
  name: string;
  twitter?: string;
  farcaster?: string;
  topic?: string;
  profile_image_url?: string;
}

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  let title = "WIP Weekly Newsletter";
  let speakers: Speaker[] = [];
  let weekDate = "";

  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });

    const raw = await redis.get(`newsletter:${id}`);
    if (raw) {
      const issue: any = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (issue.title) title = issue.title;
      if (issue.speakers?.length) speakers = issue.speakers;
      if (issue.published_at || issue.created_at) {
        weekDate = new Date(issue.published_at || issue.created_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
    }
  } catch {
    // Fall through with defaults
  }

  // Prefetch speaker avatars as base64 to avoid CORS issues in Satori
  const speakerAvatars: (string | null)[] = await Promise.all(
    speakers.slice(0, 4).map(async (s) => {
      const url =
        s.profile_image_url ||
        `https://unavatar.io/twitter/${s.twitter || s.name}`;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "image/png";
        return `data:${contentType};base64,${arrayBufferToBase64(buf)}`;
      } catch {
        return null;
      }
    })
  );

  const displaySpeakers = speakers.slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200",
          height: "630",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0612 0%, #1a0a2e 50%, #0a0612 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow effects */}
        <div
          style={{
            position: "absolute",
            top: "-100",
            left: "200",
            width: "400",
            height: "400",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100",
            right: "200",
            width: "400",
            height: "400",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* WIP Logo */}
        <img
          src={WIP_LOGO_URL}
          width="80"
          height="80"
          style={{
            borderRadius: "16px",
            border: "2px solid rgba(236,72,153,0.5)",
            marginBottom: "16px",
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: "42",
            fontWeight: "800",
            color: "#ffffff",
            textAlign: "center",
            marginBottom: "4px",
            display: "flex",
          }}
        >
          The WIP Meetup
        </div>

        <div
          style={{
            fontSize: "18",
            color: "rgba(255,255,255,0.5)",
            marginBottom: "28",
            display: "flex",
          }}
        >
          Every Thursday · 3 PM ET
        </div>

        {/* Speaker cards */}
        {displaySpeakers.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "24",
              marginBottom: "24",
            }}
          >
            {displaySpeakers.map((speaker, i) => (
              <div
                key={speaker.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8",
                  padding: "20px 28px",
                  borderRadius: "16px",
                  border: "2px solid rgba(236,72,153,0.6)",
                  background: "rgba(26,10,46,0.8)",
                  minWidth: "180",
                  maxWidth: "260",
                }}
              >
                {speakerAvatars[i] ? (
                  <img
                    src={speakerAvatars[i]!}
                    width="64"
                    height="64"
                    style={{
                      borderRadius: "50%",
                      border: "2px solid rgba(236,72,153,0.5)",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "64",
                      height: "64",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #7c3aed, #ec4899)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "28",
                      fontWeight: "700",
                      color: "#fff",
                    }}
                  >
                    {speaker.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  style={{
                    fontSize: "22",
                    fontWeight: "700",
                    color: "#ffffff",
                    textAlign: "center",
                    display: "flex",
                  }}
                >
                  {speaker.name}
                </div>
                {speaker.twitter && (
                  <div
                    style={{
                      fontSize: "14",
                      color: "#60a5fa",
                      display: "flex",
                    }}
                  >
                    @{speaker.twitter}
                  </div>
                )}
                {speaker.topic && (
                  <div
                    style={{
                      fontSize: "13",
                      color: "rgba(255,255,255,0.6)",
                      textAlign: "center",
                      display: "flex",
                      maxWidth: "220",
                    }}
                  >
                    {speaker.topic.length > 50
                      ? speaker.topic.slice(0, 47) + "..."
                      : speaker.topic}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Title bar */}
        <div
          style={{
            fontSize: "20",
            fontWeight: "600",
            color: "rgba(255,255,255,0.85)",
            display: "flex",
          }}
        >
          {title}
        </div>

        {weekDate && (
          <div
            style={{
              fontSize: "14",
              color: "rgba(255,255,255,0.4)",
              marginTop: "4",
              display: "flex",
            }}
          >
            {weekDate}
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
