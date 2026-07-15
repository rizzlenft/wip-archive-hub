import { describe, expect, it } from "vitest";
import { createManualNewsletterDraft } from "@/lib/newsletter";

describe("newsletter card metadata", () => {
  it("includes speakers and recap_summary on created drafts", () => {
    const draft = createManualNewsletterDraft({
      speakers: [{ name: "Uncle Matt", twitter: "Unc_MattEth", topic: "Bob's Turtle Tank" }],
      transcript: "Great vibes last week with Uncle Matt.",
      youtube_video_id: "abc12345678",
      youtube_video_title: "The WIP Meetup episode title",
    });

    expect(draft.speakers).toHaveLength(1);
    expect(draft.speakers[0].name).toBe("Uncle Matt");
    expect(draft.speakers[0].profile_image_url).toContain("action=avatar");
    expect(draft.recap_summary).toContain("Great vibes");
    expect(draft.cover_image).toContain("abc12345678");
    expect(draft.youtube_video_id).toBe("abc12345678");
    expect(draft.body_html).toContain("Uncle Matt");
  });
});
