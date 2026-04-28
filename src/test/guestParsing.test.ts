import { describe, expect, it } from "vitest";
import { getGuestsForEpisode, parseGuestsFromTitle } from "@/lib/youtube";

describe("event guest parsing", () => {
  it("keeps current latest event speaker tag focused on the guest", () => {
    expect(getGuestsForEpisode("0X1SxcbuG40", "The WIP Meetup 4/23/2026 Raw Footage ft BlockChain Radio w/ Pierce_NFT & The Cryptovoxels Conga")).toEqual(["Pierce_NFT"]);
  });

  it("removes topic suffixes from common archive titles", () => {
    expect(parseGuestsFromTitle("The WIP Meetup 02/20/2025 Raw Footage ft 105 Collective & MetaRick tour of Hyperfy V2")).toEqual(["105 Collective", "MetaRick"]);
  });
});