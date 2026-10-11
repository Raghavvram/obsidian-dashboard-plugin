import { describe, it, expect } from "vitest";
import { toDateKey } from "../src/date-utils";

describe("toDateKey", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(toDateKey(new Date(2026, 9, 12))).toBe("2026-10-12");
  });
  it("zero-pads single-digit months and days", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
  it("uses local time, not UTC", () => {
    expect(toDateKey(new Date(2026, 11, 31, 23, 30))).toBe("2026-12-31");
  });
});