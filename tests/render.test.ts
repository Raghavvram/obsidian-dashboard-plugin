import { describe, it, expect, beforeEach } from "vitest";
import { renderTiles, renderHeatmap, renderDashboard } from "../src/render";
import { buildHeatmap } from "../src/heatmap";

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

describe("renderDashboard", () => {
  it("renders tiles and heatmap together", () => {
    renderDashboard(el, [{ name: "Work", count: 1 }], buildHeatmap(new Map(), new Date(2026, 9, 12)));
    expect(el.querySelector(".dashboard-tile")).not.toBeNull();
    expect(el.querySelectorAll(".dashboard-cell")).toHaveLength(53 * 7);
  });
});