import { describe, expect, it } from "vitest";
import { isNewerThanStoredCursor, type Episode } from "@/lib/youtube";

const makeEpisode = (overrides: Partial<Episode>): Episode => ({
  videoId: "video-id",
  title: "The WIP Meetup 4/23/2026 Raw Footage ft BlockChain Radio w/ Pierce_NFT",
  thumbnail: "https://img.youtube.com/vi/video-id/mqdefault.jpg",
  publishedAt: new Date("2026-04-23T00:00:00.000Z"),
  url: "https://www.youtube.com/watch?v=video-id",
  guests: [],
  episodeNumber: null,
  ...overrides,
});

describe("YouTube archive cursor guardrail", () => {
  it("keeps same-day WIP Meetup videos so latest events are not dropped behind archive clips", () => {
    const storedClip = makeEpisode({
      videoId: "stored-clip",
      title: "A same-day archive clip",
    });

    const latestMeetup = makeEpisode({
      videoId: "0X1SxcbuG40",
    });

    expect(isNewerThanStoredCursor(latestMeetup, storedClip)).toBe(true);
  });

  it("still excludes the exact stored cursor video", () => {
    const stored = makeEpisode({ videoId: "same-video" });
    const duplicate = makeEpisode({ videoId: "same-video" });

    expect(isNewerThanStoredCursor(duplicate, stored)).toBe(false);
  });
});