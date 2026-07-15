import { describe, expect, it } from "vitest";
import { createManualNewsletterDraft } from "@/lib/newsletter";

describe("createManualNewsletterDraft", () => {
  it("builds a poster with logo, speaker avatar, and youtube cover", () => {
    const draft = createManualNewsletterDraft({
      speakers: [
        {
          name: "Uncle Matt",
          twitter: "unc_matteth",
          topic: "Bob's Turtle Tank",
        },
      ],
      transcript: "Great vibes last week.",
      youtube_video_id: "0X1SxcbuG40",
      youtube_video_title: "The WIP Meetup 4/23/2026 Raw Footage ft BlockChain Radio",
    });

    expect(draft.title).toMatch(/^WIP Meetup - /);
    expect(draft.body_html).toContain("images/wip-logo.gif");
    expect(draft.body_html).toContain("Uncle Matt");
    expect(draft.body_html).toContain("action=avatar");
    expect(draft.body_html).toContain("img.youtube.com/vi/0X1SxcbuG40/maxresdefault.jpg");
    expect(draft.body_html).toContain("The WIP Meetup 4/23/2026 Raw Footage ft BlockChain Radio");
    expect(draft.body_html).toContain("Bob's Turtle Tank");
    expect(draft.body_html).toContain("HUGE shoutout to the WIP Crew");
    expect(draft.cover_image).toContain("0X1SxcbuG40");
    expect(draft.body_markdown).toContain("## 🎤 This Week's Speakers");
    expect(draft.body_markdown).toContain("The WIP Meetup 4/23/2026 Raw Footage ft BlockChain Radio");
    expect(draft.speakers[0].profile_image_url).toContain("action=avatar");
  });
});
