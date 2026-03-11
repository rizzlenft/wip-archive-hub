import { describe, it, expect, vi } from "vitest";

// We test the isAfterEventWindow logic directly by extracting it
// Since it's not exported, we replicate the core logic here for unit testing

const THURSDAY = 4;

function findThursdayCutoffUTC(weekOfISO: string): Date {
  const weekOf = new Date(weekOfISO);
  const day = weekOf.getUTCDay();
  const daysToThursday = (THURSDAY - day + 7) % 7;
  const thursday = new Date(weekOf);
  thursday.setUTCDate(thursday.getUTCDate() + daysToThursday);

  // 6 PM ET. In March (EDT), ET = UTC-4, so 6 PM ET = 22:00 UTC
  // In winter (EST), ET = UTC-5, so 6 PM ET = 23:00 UTC
  // We'll test with EDT (March) → offset = -4 → 18 - (-4) = 22
  const cutoffUTC = new Date(Date.UTC(
    thursday.getUTCFullYear(),
    thursday.getUTCMonth(),
    thursday.getUTCDate(),
    22, // 6 PM EDT = 22:00 UTC (March 2026 is EDT)
    0, 0
  ));
  return cutoffUTC;
}

describe("isAfterEventWindow logic", () => {
  it("should find the correct Thursday from a Monday week_of date", () => {
    // Monday March 9, 2026
    const cutoff = findThursdayCutoffUTC("2026-03-09T00:00:00Z");
    // Thursday March 12, 2026 at 22:00 UTC
    expect(cutoff.getUTCDay()).toBe(THURSDAY);
    expect(cutoff.getUTCDate()).toBe(12);
    expect(cutoff.getUTCHours()).toBe(22);
  });

  it("should find the same Thursday when week_of is already Thursday", () => {
    const cutoff = findThursdayCutoffUTC("2026-03-12T00:00:00Z");
    expect(cutoff.getUTCDay()).toBe(THURSDAY);
    expect(cutoff.getUTCDate()).toBe(12);
  });

  it("before cutoff should not be expired", () => {
    const cutoff = findThursdayCutoffUTC("2026-03-09T00:00:00Z");
    // 5 PM ET on Thursday = 21:00 UTC → before 22:00 cutoff
    const before = new Date("2026-03-12T21:00:00Z");
    expect(before < cutoff).toBe(true);
  });

  it("after cutoff should be expired", () => {
    const cutoff = findThursdayCutoffUTC("2026-03-09T00:00:00Z");
    // 7 PM ET on Thursday = 23:00 UTC → after 22:00 cutoff
    const after = new Date("2026-03-12T23:00:00Z");
    expect(after > cutoff).toBe(true);
  });

  it("Wednesday should not be expired", () => {
    const cutoff = findThursdayCutoffUTC("2026-03-09T00:00:00Z");
    const wednesday = new Date("2026-03-11T15:00:00Z");
    expect(wednesday < cutoff).toBe(true);
  });

  it("Friday should be expired", () => {
    const cutoff = findThursdayCutoffUTC("2026-03-09T00:00:00Z");
    const friday = new Date("2026-03-13T12:00:00Z");
    expect(friday > cutoff).toBe(true);
  });
});
