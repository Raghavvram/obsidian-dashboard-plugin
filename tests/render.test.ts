import { describe, it, expect, beforeEach } from "vitest";
import { renderTiles, renderHeatmap, renderDashboard, renderYearSelector } from "../src/render";
import { buildHeatmap, buildYearHeatmap } from "../src/heatmap";

let el: HTMLElement;
beforeEach(() => { el = document.createElement("div"); });

describe("renderTiles", () => {
  it("renders one tile per folder with name and count", () => {
    renderTiles(el, [{ name: "Work", count: 12 }]);
    const tiles = el.querySelectorAll(".dashboard-tile");
    expect(tiles).toHaveLength(1);
    expect(tiles[0].querySelector(".dashboard-tile-name")!.textContent).toBe("Work");
    expect(tiles[0].querySelector(".dashboard-tile-count")!.textContent).toBe("12");
  });
  it("shows an empty state when there are no folders", () => {
    renderTiles(el, []);
    expect(el.querySelector(".dashboard-empty")).not.toBeNull();
    expect(el.querySelectorAll(".dashboard-tile")).toHaveLength(0);
  });
});

describe("renderHeatmap", () => {
  it("renders 53x7 cells with level classes and a title tooltip", () => {
    const m = buildHeatmap(new Map([["2026-10-12", 3]]), new Date(2026, 9, 12));
    renderHeatmap(el, m);
    const cells = el.querySelectorAll(".dashboard-cell");
    expect(cells).toHaveLength(53 * 7);
    const today = el.querySelector('[data-date="2026-10-12"]')!;
    expect(today.classList.contains("level-4")).toBe(true);
    expect(today.getAttribute("title")).toBe("3 notes on 2026-10-12");
  });
  it("marks future cells", () => {
    const m = buildHeatmap(new Map(), new Date(2026, 9, 12));
    renderHeatmap(el, m);
    const tomorrow = el.querySelector('[data-date="2026-10-13"]')!;
    expect(tomorrow.classList.contains("is-future")).toBe(true);
    expect(tomorrow.getAttribute("title")).toBe("0 notes on 2026-10-13");
  });
});

describe("renderYearSelector", () => {
  it("renders a Recent option plus one option per year in descending order", () => {
    renderYearSelector(el, { years: [2024, 2025, 2026], selectedYear: null, onChange: () => {} });
    const select = el.querySelector("select.dashboard-heatmap-year")!;
    expect(select).not.toBeNull();
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
    expect(options).toEqual(["Recent", "2026", "2025", "2024"]);
    expect(select.querySelector("option")!.selected).toBe(true);
  });
  it("selects the chosen year and reports changes as a year or Recent", () => {
    const picked: (number | null)[] = [];
    renderYearSelector(el, { years: [2024, 2026], selectedYear: 2024, onChange: (y) => picked.push(y) });
    const select = el.querySelector("select.dashboard-heatmap-year") as HTMLSelectElement;
    expect(select.value).toBe("2024");
    select.value = "2026";
    select.dispatchEvent(new Event("change"));
    select.value = "recent";
    select.dispatchEvent(new Event("change"));
    expect(picked).toEqual([2026, null]);
  });
});

describe("renderDashboard", () => {
  it("renders tiles and heatmap together", () => {
    renderDashboard(el, [{ name: "Work", count: 1 }], buildHeatmap(new Map(), new Date(2026, 9, 12)));
    expect(el.querySelector(".dashboard-tile")).not.toBeNull();
    expect(el.querySelectorAll(".dashboard-cell")).toHaveLength(53 * 7);
  });
  it("embeds the year selector when years are provided", () => {
    renderDashboard(el, [], buildYearHeatmap(new Map(), 2026, new Date(2026, 9, 12)), {
      years: [2026],
      selectedYear: null,
      onChange: () => {},
    });
    expect(el.querySelector("select.dashboard-heatmap-year")).not.toBeNull();
  });
});