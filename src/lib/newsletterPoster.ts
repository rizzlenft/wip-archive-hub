import { API_BASE } from "./api";
import type { NewsletterSpeaker } from "./newsletter";

const SITE_URL = "https://thewipmeetup.com";
const WIP_LOGO_GIF = `${SITE_URL}/images/wip-logo.gif`;
const WIP_LOGO_STATIC = `${SITE_URL}/images/wip-logo-static.png`;
const WIP_LOGO_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='16' fill='%230a0612'/%3E%3Crect x='2' y='2' width='76' height='76' rx='14' fill='none' stroke='%23e84393' stroke-width='3'/%3E%3Ctext x='40' y='48' font-family='Arial,sans-serif' font-size='28' font-weight='bold' fill='%23f5f0e8' text-anchor='middle'%3EWIP%3C/text%3E%3C/svg%3E";

const WIP_CREW = [
  { name: "Matt", url: "https://x.com/niftytime" },
  { name: "Rizzle", url: "https://x.com/NFTland" },
  { name: "Paradoxx", url: "https://x.com/Paradoxx_Arts" },
  { name: "Sho", url: "https://x.com/itsreallysho" },
  { name: "Sandymeows", url: "https://x.com/sandyme0ws" },
  { name: "Itscarolinahduh", url: "https://x.com/itscarolinaduh_" },
  { name: "Kanwulf", url: "https://x.com/lordkanwulf" },
  { name: "Fabiano", url: "https://x.com/fabianospeziari" },
  { name: "Patrizia", url: "https://x.com/patriziabarnato" },
  { name: "EZinCrypto", url: "https://x.com/ez_cbd" },
  { name: "Foxyoga", url: "https://x.com/foxyoga_om" },
  { name: "Fractilians", url: "https://x.com/Fractilians7" },
  { name: "Tati", url: "https://x.com/adigitaltati" },
  { name: "Juxton", url: "https://x.com/juxton" },
  { name: "Metageist", url: "https://x.com/MetageistVR" },
  { name: "Trippyogi", url: "https://x.com/trippyogi" },
  { name: "Ray Buckton", url: "https://x.com/RayBuckton" },
  { name: "Hidden Forces", url: "https://x.com/ForcesHidden" },
  { name: "Valiant", url: "https://x.com/V_A_L_I_A_N_T" },
  { name: "Stina Jones", url: "https://x.com/stina_jones" },
  { name: "DragoNate", url: "https://x.com/DragoNateYT" },
  { name: "Johan", url: "https://x.com/supahmarbler" },
] as const;

type PosterTheme = {
  name: string;
  accent1: string;
  accent2: string;
  accent3: string;
};

const THEMES: PosterTheme[] = [
  { name: "Neon Nights", accent1: "#e84393", accent2: "#a29bfe", accent3: "#00cec9" },
  { name: "Cyberpunk", accent1: "#00cec9", accent2: "#e84393", accent3: "#fdcb6e" },
  { name: "Sunset", accent1: "#e17055", accent2: "#fdcb6e", accent3: "#e84393" },
  { name: "Retro Arcade", accent1: "#39ff14", accent2: "#ff073a", accent3: "#0ff" },
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pickTheme(date = new Date()): PosterTheme {
  const weekIndex = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
  return THEMES[weekIndex % THEMES.length];
}

/** Next Thursday date string for titles, e.g. 7/16/2026 */
export function getNextMeetupDateLabel(date = new Date()): string {
  const day = date.getUTCDay();
  let daysUntilThursday = (4 - day + 7) % 7;
  if (daysUntilThursday === 0) daysUntilThursday = 7;
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + daysUntilThursday);
  return `${next.getUTCMonth() + 1}/${next.getUTCDate()}/${next.getUTCFullYear()}`;
}

export function resolveSpeakerAvatarUrl(speaker: NewsletterSpeaker): string {
  if (speaker.profile_image_url?.trim()) {
    return speaker.profile_image_url.trim();
  }
  const params = new URLSearchParams({ action: "avatar" });
  if (speaker.name) params.set("name", speaker.name);
  if (speaker.farcaster) params.set("farcaster", speaker.farcaster);
  if (speaker.twitter) params.set("twitter", speaker.twitter);
  return `${API_BASE}/api/newsletter?${params.toString()}`;
}

function speakerSocialHtml(speaker: NewsletterSpeaker): string {
  const links: string[] = [];
  if (speaker.twitter) {
    const handle = speaker.twitter.replace(/^@/, "");
    links.push(
      `<a href="https://x.com/${escapeHtml(handle)}" target="_blank" style="color:#1DA1F2;text-decoration:none;font-weight:bold;">𝕏 @${escapeHtml(handle)}</a>`,
    );
  }
  if (speaker.farcaster) {
    const handle = speaker.farcaster.replace(/^@/, "");
    links.push(
      `<a href="https://warpcast.com/${escapeHtml(handle)}" target="_blank" style="color:#8B5CF6;text-decoration:none;font-weight:bold;">🟣 @${escapeHtml(handle)}</a>`,
    );
  }
  if (!links.length) return "";
  return `<div style="text-align:center;margin-top:8px;line-height:1.8;">${links.join("<br>")}</div>`;
}

function speakerTopicHtml(topic: string | undefined, accent: string): string {
  const cleaned = (topic || "").replace(/^(topic:\s*)+/i, "").trim();
  if (!cleaned) return "";
  if (/^https?:\/\//i.test(cleaned)) {
    return `<div style="color:${accent};font-size:14px;margin-top:8px;text-align:center;">Topic: <a href="${escapeHtml(cleaned)}" target="_blank" style="color:${accent};text-decoration:underline;">${escapeHtml(cleaned)}</a></div>`;
  }
  return `<div style="color:${accent};font-size:14px;margin-top:8px;text-align:center;">Topic: ${escapeHtml(cleaned)}</div>`;
}

function speakerCardHtml(speaker: NewsletterSpeaker, theme: PosterTheme, widthPct: number): string {
  const name = speaker.name.trim();
  const avatar = resolveSpeakerAvatarUrl(speaker);
  const bio = speaker.bio?.trim()
    ? `<div style="text-align:center;margin-top:8px;font-style:italic;color:#b0a8c0;font-size:14px;">${escapeHtml(speaker.bio.trim())}</div>`
    : "";

  return `<td width="${widthPct}%" valign="top" style="padding:12px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border:3px solid ${theme.accent1};border-radius:12px;box-shadow:0 0 20px ${theme.accent1}40;background:linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%), #0f0a1a;">
    <tr><td align="center" style="padding:20px 12px;">
      <img src="${escapeHtml(avatar)}" width="100" height="100" alt="${escapeHtml(name)}" style="display:block;margin:0 auto 16px;border-radius:50%;border:3px solid ${theme.accent1};box-shadow:0 0 15px ${theme.accent1}40;object-fit:cover;" onerror="this.onerror=null;this.src='${WIP_LOGO_FALLBACK}';" />
      <div style="font-size:28px;font-weight:900;color:#f5f0e8;text-align:center;letter-spacing:-1px;text-shadow:0 0 10px ${theme.accent1};">${escapeHtml(name)}</div>
      ${speakerSocialHtml(speaker)}
      ${speakerTopicHtml(speaker.topic, theme.accent1)}
      ${bio}
    </td></tr>
  </table>
</td>`;
}

function speakersSectionHtml(speakers: NewsletterSpeaker[], theme: PosterTheme): string {
  if (!speakers.length) return "";
  const widthPct = Math.floor(100 / Math.min(speakers.length, 4));
  const cards = speakers.slice(0, 4).map((s) => speakerCardHtml(s, theme, widthPct)).join("");
  return `
  <tr>
    <td align="center" style="padding:16px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;margin:0 auto;">
        <tr><td style="font-size:12px;letter-spacing:5px;color:${theme.accent3};text-transform:uppercase;text-align:center;padding-bottom:16px;">This Week's Headliners</td></tr>
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0"><tr>${cards}</tr></table>
        </td></tr>
      </table>
    </td>
  </tr>`;
}

function youtubeSectionHtml(
  youtubeId: string | undefined,
  theme: PosterTheme,
  recap: string,
  youtubeTitle?: string,
): string {
  const synopsis = escapeHtml(recap).replace(/\n/g, "<br>");
  const overlayTitle = (youtubeTitle || "").trim() || "The WIP Meetup — Watch the Replay";
  const replay = youtubeId
    ? `
      <a href="https://youtube.com/watch?v=${escapeHtml(youtubeId)}" target="_blank" style="display:block;position:relative;text-decoration:none;margin:16px 0;">
        <img src="https://img.youtube.com/vi/${escapeHtml(youtubeId)}/maxresdefault.jpg" width="100%" style="display:block;border-radius:8px;" alt="${escapeHtml(overlayTitle)}" />
        <div style="position:absolute;bottom:0;left:0;right:0;padding:16px 12px 12px;background:linear-gradient(transparent, rgba(0,0,0,0.85));border-radius:0 0 8px 8px;">
          <span style="color:#f5f0e8;font-size:14px;font-weight:bold;text-shadow:0 1px 3px rgba(0,0,0,0.8);">${escapeHtml(overlayTitle)}</span>
        </div>
      </a>
      <table align="center" cellpadding="0" cellspacing="0"><tr><td align="center" style="text-align:center;">
        <a href="https://youtube.com/watch?v=${escapeHtml(youtubeId)}" target="_blank" style="display:inline-block;padding:14px 32px;background:#000000;color:#f5f0e8;font-weight:bold;font-size:18px;text-decoration:none;border-radius:6px;border:2px solid #333;">▶ Watch the Replay</a>
      </td></tr></table>`
    : "";

  return `
  <tr>
    <td align="center" style="padding:16px 12px;background:#0a0612;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;margin:0 auto;">
        <tr><td style="font-size:12px;letter-spacing:5px;color:${theme.accent1};text-transform:uppercase;text-align:center;padding-bottom:12px;">Last Week's Recap</td></tr>
        <tr><td style="color:#f5f0e8;font-size:16px;line-height:1.6;text-align:center;padding:0 8px 8px;">${synopsis}</td></tr>
        <tr><td>${replay}</td></tr>
      </table>
    </td>
  </tr>`;
}

function ticketStub(label: string, href: string, accent: string): string {
  return `<td style="padding:8px;" width="20%" valign="top">
    <a href="${href}" target="_blank" style="display:block;text-align:center;padding:14px 8px;border:2px dashed ${accent};border-radius:6px;color:#f5f0e8;text-decoration:none;font-weight:bold;font-size:12px;box-shadow:0 0 12px ${accent}30;">${label}</a>
  </td>`;
}

function communitySectionHtml(theme: PosterTheme): string {
  return `
  <tr>
    <td align="center" style="padding:16px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;">
        <tr>
          ${ticketStub("Join Discord", "https://discord.gg/bTjc6k5uss", theme.accent1)}
          ${ticketStub("Follow on X", "https://twitter.com/theWIPmeetup", theme.accent2)}
          ${ticketStub("YouTube", "https://youtube.com/@thewipmeetup", theme.accent3)}
          ${ticketStub("Farcaster", "https://farcaster.xyz/~/channel/thewipmeetup", theme.accent1)}
          ${ticketStub("Website", SITE_URL, theme.accent2)}
        </tr>
      </table>
    </td>
  </tr>`;
}

function cardSectionHtml(title: string, body: string, theme: PosterTheme): string {
  return `
  <tr>
    <td align="center" style="padding:12px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;border:3px solid ${theme.accent1};border-radius:12px;box-shadow:0 0 20px ${theme.accent1}30;">
        <tr><td style="padding:20px 16px;text-align:center;">
          <div style="font-size:20px;font-weight:900;color:#f5f0e8;margin-bottom:10px;">${title}</div>
          <div style="color:#b0a8c0;font-size:15px;line-height:1.6;">${body}</div>
        </td></tr>
      </table>
    </td>
  </tr>`;
}

function crewSectionHtml(): string {
  const links = WIP_CREW.map(
    (m) =>
      `<a href="${m.url}" target="_blank" style="color:#e84393;text-decoration:none;font-weight:bold;">${escapeHtml(m.name)}</a>`,
  ).join(" | ");
  return `
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;margin:0 auto;border-top:1px solid #333;">
        <tr><td align="center" style="text-align:center;padding:20px 12px;">
          <div style="font-size:14px;color:#f5f0e8;margin-bottom:8px;font-weight:bold;">HUGE shoutout to the WIP Crew, past and present:</div>
          <div style="font-size:13px;line-height:2;">${links}</div>
        </td></tr>
      </table>
    </td>
  </tr>`;
}

export function buildNewsletterPosterHtml(input: {
  speakers: NewsletterSpeaker[];
  transcript?: string;
  youtube_video_id?: string;
  youtube_video_title?: string;
}): string {
  const theme = pickTheme();
  const speakers = input.speakers.filter((s) => s.name.trim());
  const youtubeId = input.youtube_video_id?.trim() || "";
  const youtubeTitle = input.youtube_video_title?.trim() || "";
  const recap =
    input.transcript?.trim() ||
    (youtubeId
      ? "Missed last week? Our guests dropped some incredible insights — catch the replay!"
      : "Add this week's recap here.");

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0612;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;margin:0 auto;">
        <tr>
          <td align="center" style="padding-bottom:12px;">
            <img src="${WIP_LOGO_GIF}" onerror="this.onerror=null;this.src='${WIP_LOGO_STATIC}';this.onerror=function(){this.src='${WIP_LOGO_FALLBACK}';};" width="80" height="80" style="display:block;margin:0 auto 8px;border-radius:16px;border:3px solid ${theme.accent1};box-shadow:0 0 15px ${theme.accent1}40;" alt="WIP" />
            <div style="font-size:40px;font-weight:900;color:#f5f0e8;text-shadow:0 0 10px ${theme.accent1}, 0 0 20px ${theme.accent1}40;letter-spacing:-1px;">The WIP Meetup</div>
            <div style="font-size:16px;color:#b0a8c0;margin-top:8px;margin-bottom:24px;">Every Thursday · 3 PM ET</div>
            <table align="center" cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="padding:0 8px;text-align:center;"><a href="${SITE_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 28px;border:2px solid ${theme.accent1};font-weight:bold;color:#f5f0e8;text-decoration:none;border-radius:4px;box-shadow:0 0 15px ${theme.accent1}40;">Visit Website</a></td>
              <td style="padding:0 8px;text-align:center;"><a href="https://discord.gg/bTjc6k5uss" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 28px;border:2px dashed #999;font-weight:bold;color:${theme.accent2};text-decoration:none;border-radius:4px;">Join Discord</a></td>
            </tr></table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  ${speakersSectionHtml(speakers, theme)}
  ${youtubeSectionHtml(youtubeId, theme, recap, youtubeTitle)}
  ${communitySectionHtml(theme)}
  ${cardSectionHtml(
    "🪙 $WIP Token Rewards",
    `Attend our weekly meetups and receive $WIP tokens as a thank you for being part of our community. Every attendee gets rewarded!<br><br>
    <a href="https://wip-staking.pages.dev/trade" target="_blank" style="color:${theme.accent1};text-decoration:underline;font-weight:bold;">Buy and Stake $WIP</a> ·
    <a href="https://www.geckoterminal.com/base/pools/0x32dd94d272e5b4ef47e8694100b7c3eb7de3d09d" target="_blank" style="color:${theme.accent2};text-decoration:underline;font-weight:bold;">View Chart</a>`,
    theme,
  )}
  ${cardSectionHtml(
    "💜 Support the WIP",
    `Love what we're building? Every donation—big or small—helps keep the meetups running, artists creating, and community growing.<br><br>
    <table align="center" cellpadding="0" cellspacing="0"><tr><td align="center" style="text-align:center;">
      <a href="https://piri-pay.vercel.app/tip/qY3jM8YzHk" target="_blank" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#a29bfe,#e84393);color:#f5f0e8;font-weight:bold;font-size:16px;text-decoration:none;border-radius:6px;">💜 Donate Now</a>
    </td></tr></table>`,
    theme,
  )}
  ${cardSectionHtml(
    "🎙 Want to be on the WIP?",
    `Whether you want to make a guest appearance, showcase your project, or sponsor an upcoming event—reach out to Rizzle to get the conversation started.<br><br>
    <table align="center" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:0 8px;text-align:center;"><a href="https://x.com/NFTland" target="_blank" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#a29bfe,#e84393);color:#f5f0e8;font-weight:bold;font-size:16px;text-decoration:none;border-radius:6px;">🎙 Be a Guest</a></td>
      <td style="padding:0 8px;text-align:center;"><a href="https://x.com/NFTland" target="_blank" style="display:inline-block;padding:14px 28px;background:#0a0612;border:2px solid #e84393;color:#f5f0e8;font-weight:bold;font-size:16px;text-decoration:none;border-radius:6px;">📡 Sponsor an Event</a></td>
    </tr></table>`,
    theme,
  )}
  ${cardSectionHtml(
    "🎁 Free NFT Gifts",
    `Each week, our amazing artists Fabiano &amp; Patrizia create unique voxel art NFTs gifted to attendees—beautiful collectibles just for showing up!<br><br>
    <a href="https://x.com/fabianospeziari" target="_blank" style="color:#1DA1F2;text-decoration:none;font-weight:bold;">𝕏 @Fabiano</a> ·
    <a href="https://x.com/patriziabarnato" target="_blank" style="color:#1DA1F2;text-decoration:none;font-weight:bold;">𝕏 @Patrizia</a> ·
    <a href="https://opensea.io/collection/random-3d-things" target="_blank" style="color:${theme.accent1};text-decoration:underline;font-weight:bold;">View Collection</a>`,
    theme,
  )}
  ${crewSectionHtml()}
</table>`;
}

export function buildNewsletterPosterMarkdown(input: {
  title: string;
  speakers: NewsletterSpeaker[];
  transcript?: string;
  youtube_video_id?: string;
  youtube_video_title?: string;
}): string {
  const speakers = input.speakers.filter((s) => s.name.trim());
  const youtubeId = input.youtube_video_id?.trim() || "";
  const youtubeTitle = input.youtube_video_title?.trim() || "";
  const recap =
    input.transcript?.trim() ||
    (youtubeId
      ? "Missed last week? Our guests dropped some incredible insights — catch the replay!"
      : "Add this week's recap here.");

  const speakerBlocks = speakers
    .map((s) => {
      const lines = [`**${s.name.trim()}**`, ""];
      if (s.bio?.trim()) lines.push(s.bio.trim(), "");
      if (s.twitter) lines.push(`[𝕏 @${s.twitter.replace(/^@/, "")}](https://x.com/${s.twitter.replace(/^@/, "")})`, "");
      if (s.farcaster) {
        lines.push(
          `[🟣 @${s.farcaster.replace(/^@/, "")}](https://warpcast.com/${s.farcaster.replace(/^@/, "")})`,
          "",
        );
      }
      const topic = (s.topic || "").replace(/^(topic:\s*)+/i, "").trim();
      if (topic) {
        if (/^https?:\/\//i.test(topic)) lines.push(`Topic: [Link](${topic})`, "");
        else lines.push(`Topic: ${topic}`, "");
      }
      return lines.join("\n").trim();
    })
    .join("\n\n---\n\n");

  const crewMd = WIP_CREW.map((m) => `[${m.name}](${m.url})`).join(" | ");

  return `# ${input.title}

---

## 🎤 This Week's Speakers

${speakerBlocks || "_Add speakers in compose._"}

---

## 🔁 Last Week's Recap

${recap}

${youtubeTitle ? `**${youtubeTitle}**\n` : ""}${youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : ""}

---

## 🎟️ Join the Community

[Join Discord](https://discord.gg/bTjc6k5uss)

[Follow on 𝕏 / Twitter](https://twitter.com/theWIPmeetup)

[Subscribe on YouTube](https://youtube.com/@thewipmeetup)

[Join Farcaster Channel](https://farcaster.xyz/~/channel/thewipmeetup)

[Explore the Website](${SITE_URL})

---

## 🪙 Attendee Rewards

**$WIP Token Rewards**

Attend our weekly meetups and receive $WIP tokens as a thank you for being part of our community. Every attendee gets rewarded!

[Buy and Stake $WIP](https://wip-staking.pages.dev/trade) · [View Chart](https://www.geckoterminal.com/base/pools/0x32dd94d272e5b4ef47e8694100b7c3eb7de3d09d)

---

## 💜 Support the WIP

Love what we're building? Every donation—big or small—helps keep the meetups running, artists creating, and community growing.

[💜 Donate Now](https://piri-pay.vercel.app/tip/qY3jM8YzHk)

---

## 🎙️ Want to be on the WIP?

Whether you want to make a guest appearance, showcase your project, or sponsor an upcoming event—reach out to **Rizzle** to get the conversation started.

[🎙 Be a Guest](https://x.com/NFTland) · [📡 Sponsor an Event](https://x.com/NFTland)

---

## 🎁 Free NFT Gifts

Each week, our amazing artists Fabiano & Patrizia create unique voxel art NFTs gifted to attendees—beautiful collectibles just for showing up!

[𝕏 @Fabiano](https://x.com/fabianospeziari) · [𝕏 @Patrizia](https://x.com/patriziabarnato) · [View Collection](https://opensea.io/collection/random-3d-things)

---

HUGE shoutout to the WIP Crew, past and present:

${crewMd}
`.trim();
}
