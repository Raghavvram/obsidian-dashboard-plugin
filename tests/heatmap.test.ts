import { describe, it, expect } from "vitest";
import { buildHeatmap } from "../src/heatmap";

const today = new Date(2026, 9, 12); // Monday 2026-10-12

describe("buildHeatmap", () => {
  it("produces 53 weeks of 7 days", () => {
    const m = buildHeatmap(new Map(), today);
    expect(m.weeks).toHaveLength(53);
    for (const w of m.weeks) expect(w).toHaveLength(7);
  });

  it("starts columns on Sunday and ends in the current partial week", () => {
    const m = buildHeatmap(new Map(), today);
    for (const w of m.weeks) expect(w[0].date.getDay()).toBe(0);
    const lastWeek = m.weeks[52];
    const keys = lastWeek.map((c) => c.dateKey);
    expect(keys).toContain("2026-10-12");
  });

  it("marks days after today as future, and today is not future", () => {
    const m = buildHeatmap(new Map(), today);
    const cells = m.weeks.flat();
    const todayCell = cells.find((c) => c.dateKey === "2026-10-12")!;
    expect(todayCell.isFuture).toBe(false);
    const tomorrow = cells.find((c) => c.dateKey === "2026-10-13")!;
    expect(tomorrow.isFuture).toBe(true);
  });

  it("scales levels against the busiest day, all-zero stays level 0", () => {
    const zero = buildHeatmap(new Map(), today).weeks.flat();
    expect(zero.every((c) => c.level === 0)).toBe(true);
    const activity = new Map([["2026-10-12", 4], ["2026-10-11", 1], ["2026-10-10", 2]]);
    const m = buildHeatmap(activity, today);
    const byKey = Object.fromEntries(m.weeks.flat().map((c) => [c.dateKey, c]));
    expect(m.maxCount).toBe(4);
    expect(byKey["2026-10-11"].level).toBe(1);
    expect(byKey["2026-10-10"].level).toBe(2);
    expect(byKey["2026-10-12"].level).toBe(4);
  });

  it("labels the column where each month begins", () => {
    const m = buildHeatmap(new Map(), today);
    for (const { columnIndex, label } of m.monthLabels) {
      expect(columnIndex).toBeGreaterThan(0);
      expect(label.length).toBeGreaterThan(0);
    }
  });
});