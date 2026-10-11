import { describe, it, expect } from "vitest";
import { buildHeatmap, buildYearHeatmap } from "../src/heatmap";

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

  it("scales levels against the busiest day inside the window, ignoring older spikes", () => {
    const activity = new Map([["2024-01-01", 100], ["2026-10-12", 5]]);
    const m = buildHeatmap(activity, today);
    const byKey = Object.fromEntries(m.weeks.flat().map((c) => [c.dateKey, c]));
    expect(m.maxCount).toBe(5);
    expect(byKey["2026-10-12"].level).toBe(4);
  });

  it("emits month labels at the 1-based grid column of the week a month begins", () => {
    const m = buildHeatmap(new Map(), today);
    for (const { columnIndex } of m.monthLabels) {
      const i = columnIndex - 1;
      expect(i).toBeGreaterThanOrEqual(1);
      expect(m.weeks[i][0].date.getMonth()).not.toBe(m.weeks[i - 1][0].date.getMonth());
    }
  });
});

describe("buildYearHeatmap", () => {
  it("returns one 7-day Sunday-start week per column covering the calendar year", () => {
    const m = buildYearHeatmap(new Map(), 2026, today);
    expect(m.weeks.length).toBeGreaterThanOrEqual(52);
    expect(m.weeks.length).toBeLessThanOrEqual(54);
    for (const w of m.weeks) {
      expect(w).toHaveLength(7);
      expect(w[0].date.getDay()).toBe(0);
    }
    const nonPadding = m.weeks.flat().filter((c) => !c.isPadding);
    const dates = new Set(nonPadding.map((c) => c.dateKey));
    expect(dates.size).toBe(365);
    expect(dates.has("2026-01-01")).toBe(true);
    expect(dates.has("2026-12-31")).toBe(true);
  });

  it("marks cells before Jan 1 and after Dec 31 as padding", () => {
    const m = buildYearHeatmap(new Map(), 2026, today);
    for (const cell of m.weeks.flat()) {
      if (cell.isPadding) {
        expect(cell.count).toBe(0);
        expect(cell.level).toBe(0);
        expect(cell.dateKey).toBe("");
      } else {
        expect(cell.dateKey).toBeTruthy();
      }
    }
  });

  it("scales levels against the busiest day inside the year, ignoring other years", () => {
    const activity = new Map([["2025-06-01", 100], ["2026-10-12", 5]]);
    const m = buildYearHeatmap(activity, 2026, today);
    const byKey = Object.fromEntries(m.weeks.flat().filter((c) => !c.isPadding).map((c) => [c.dateKey, c]));
    expect(m.maxCount).toBe(5);
    expect(byKey["2026-10-12"].level).toBe(4);
  });

  it("marks future cells only within the current year", () => {
    const thisYear = buildYearHeatmap(new Map(), 2026, today);
    const cells = Object.fromEntries(thisYear.weeks.flat().filter((c) => !c.isPadding).map((c) => [c.dateKey, c]));
    expect(cells["2026-10-12"].isFuture).toBe(false);
    expect(cells["2026-10-13"].isFuture).toBe(true);

    const pastYear = buildYearHeatmap(new Map(), 2024, today);
    expect(pastYear.weeks.flat().every((c) => !c.isFuture)).toBe(true);
  });

  it("labels every month Jan through Dec in order", () => {
    const m = buildYearHeatmap(new Map(), 2026, today);
    expect(m.monthLabels.map((l) => l.label)).toEqual([
      "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]);
    for (const { columnIndex } of m.monthLabels) {
      const i = columnIndex - 1;
      expect(i).toBeGreaterThanOrEqual(1);
      expect(m.weeks[i][0].date.getMonth()).not.toBe(m.weeks[i - 1][0].date.getMonth());
    }
  });
});