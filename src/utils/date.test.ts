import { describe, it, expect } from "vitest";
import { relativeTime } from "./date";

describe("relativeTime", () => {
  const now = new Date("2026-09-24T12:00:00Z").getTime();

  it("formats minutes, hours and days", () => {
    expect(relativeTime("2026-09-24T11:59:40Z", now)).toBe("now");
    expect(relativeTime("2026-09-24T11:48:00Z", now)).toBe("12 m");
    expect(relativeTime("2026-09-24T09:00:00Z", now)).toBe("3 h");
    expect(relativeTime("2026-09-22T12:00:00Z", now)).toBe("2 d");
  });

  it("falls back to a date for old items", () => {
    expect(relativeTime("2026-07-01T12:00:00Z", now)).not.toMatch(/ d$/);
  });
});
