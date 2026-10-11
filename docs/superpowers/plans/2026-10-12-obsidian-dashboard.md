# Obsidian Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Obsidian plugin that opens a full-tab Dashboard showing a tile per top-level folder with a recursive markdown-note count, plus a GitHub-style activity heatmap of the last 53 weeks.

**Architecture:** Pure data logic (date bucketing, folder counting, heatmap grid building) lives in Obsidian-free modules with unit tests. DOM rendering lives in a module that uses only the `document` API (jsdom-testable). A `DashboardView` (Obsidian `ItemView`) glues vault data to the renderer; a `Plugin` subclass registers the view, a ribbon icon, a command, and debounced refresh triggers. No runtime dependencies beyond the Obsidian API.

**Tech Stack:** TypeScript, esbuild (bundler), Vitest + jsdom (tests), Obsidian plugin API.

**Spec:** `docs/superpowers/specs/2026-10-12-obsidian-dashboard-design.md`

## Global Constraints

- Desktop only: `manifest.json` sets `"isDesktopOnly": true`. Hover tooltips are acceptable; mobile is out of scope.
- No external runtime dependencies. Only the Obsidian API and plain DOM/CSS.
- Count only markdown notes (path extension `md`).
- Exclude hidden/system folders whose name starts with `.` (`.obsidian`, `.trash`, …) from tiles, counts, and activity. Respect Obsidian's user ignore filters.
- No stored history: activity is recomputed from current `ctime`/`mtime` every render.
- Theme-aware styling (light and dark).
- Plugin id: `obsidian-dashboard`. Version `0.1.0`. `minAppVersion` `1.4.0`.

## Review Focus

Failure modes / input classes most likely to bite, each pinned by a test in its owning task:

1. **Empty vault (no folders).** Tiles show an empty state; dashboard does not crash. → Task 4.
2. **Notes only at vault root.** No tiles render, but the heatmap still shows activity. → Tasks 2, 4.
3. **Note whose `ctime` and `mtime` fall on the same day.** Counts once for that day, not twice. → Task 2.
4. **`.trash` / `.obsidian` contents.** Excluded from tiles and from activity. → Task 2.
5. **"Today" and the current partial week.** Today's cell is present and not marked future; later days in the current week are future/empty. → Task 3.

---

### Task 1: Project scaffolding and plugin shell

**Files:**
- Create: `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `vitest.config.ts`, `manifest.json`, `versions.json`, `styles.css`, `.gitignore`
- Create: `src/main.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export default class DashboardPlugin extends Plugin` in `src/main.ts` with `onload()`. `npm run build` emits `main.js` at the repo root; `npm test` runs Vitest.

- [ ] **Step 1: Initialize git and ignore build output**

```bash
git init
```

`.gitignore`:
```
node_modules/
main.js
*.map
.DS_Store
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "obsidian-dashboard",
  "version": "0.1.0",
  "description": "An at-a-glance dashboard: note counts per top-level folder and a GitHub-style activity heatmap.",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc --noEmit && node esbuild.config.mjs production",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^20.11.0",
    "builtin-modules": "^3.3.0",
    "esbuild": "^0.21.0",
    "jsdom": "^24.0.0",
    "obsidian": "^1.5.7",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`, `esbuild.config.mjs`, `vitest.config.ts`, `manifest.json`, `versions.json`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2018",
    "allowJs": true,
    "noImplicitAny": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "lib": ["DOM", "ES5", "ES6", "ES7", "ES2018"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

`esbuild.config.mjs` (standard Obsidian template):
```js
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const banner = `/* Generated bundle. Do not edit directly. */`;
const prod = process.argv[2] === "production";

const ctx = await esbuild.context({
  banner: { js: banner },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*", ...builtins],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
});

if (prod) { await ctx.rebuild(); process.exit(0); }
else { await ctx.watch(); }
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "jsdom" },
});
```

`manifest.json`:
```json
{
  "id": "obsidian-dashboard",
  "name": "Dashboard",
  "version": "0.1.0",
  "minAppVersion": "1.4.0",
  "description": "An at-a-glance dashboard: note counts per top-level folder and a GitHub-style activity heatmap.",
  "author": "",
  "authorUrl": "",
  "isDesktopOnly": true
}
```

`versions.json`:
```json
{ "0.1.0": "1.4.0" }
```

`styles.css`:
```css
/* Filled in Task 6. */
```

- [ ] **Step 4: Write the plugin shell `src/main.ts`**

`export default class DashboardPlugin extends Plugin` with the single line `async onload() {}` (empty body). Do not import anything unused.

- [ ] **Step 5: Install and build**

Run: `npm install && npm run build`
Expected: `main.js` is created at the repo root; no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Obsidian plugin project"
```

---

### Task 2: Vault data logic (date bucketing, folder counts, activity)

**Files:**
- Create: `src/date-utils.ts`, `src/vault-data.ts`
- Test: `tests/date-utils.test.ts`, `tests/vault-data.test.ts`

**Interfaces:**
- Consumes: nothing (no Obsidian imports).
- Produces:
  - `toDateKey(date: Date): string` — local `YYYY-MM-DD`.
  - `interface VaultFile { path: string; ctime: number; mtime: number }`
  - `interface FolderCount { name: string; count: number }`
  - `isMarkdownPath(path: string): boolean`
  - `isHiddenPath(path: string): boolean`
  - `selectVaultFiles(files: VaultFile[], isIgnored: (path: string) => boolean): VaultFile[]`
  - `buildFolderCounts(files: VaultFile[]): FolderCount[]`
  - `buildActivityCounts(files: VaultFile[]): Map<string, number>`

- [ ] **Step 1: Write failing tests for `src/date-utils.ts`**

`tests/date-utils.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/date-utils.test.ts`
Expected: FAIL — cannot resolve `../src/date-utils`.

- [ ] **Step 3: Implement `src/date-utils.ts`**

```ts
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/date-utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing tests for `src/vault-data.ts`**

`tests/vault-data.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  isMarkdownPath, isHiddenPath, selectVaultFiles,
  buildFolderCounts, buildActivityCounts, type VaultFile,
} from "../src/vault-data";

const f = (path: string, ctime: number, mtime: number): VaultFile => ({ path, ctime, mtime });
const never = () => false;

describe("isMarkdownPath", () => {
  it("accepts .md and rejects others", () => {
    expect(isMarkdownPath("a/b.md")).toBe(true);
    expect(isMarkdownPath("a/b.png")).toBe(false);
  });
});

describe("isHiddenPath", () => {
  it("flags any path segment starting with a dot", () => {
    expect(isHiddenPath(".obsidian/app.json")).toBe(true);
    expect(isHiddenPath(".trash/note.md")).toBe(true);
    expect(isHiddenPath("notes/.hidden/x.md")).toBe(true);
  });
  it("allows normal paths", () => {
    expect(isHiddenPath("Projects/a/b.md")).toBe(false);
  });
});

describe("selectVaultFiles", () => {
  it("keeps only markdown, non-hidden, non-ignored files", () => {
    const files = [
      f("Projects/a.md", 0, 0),
      f("Projects/a.png", 0, 0),
      f(".trash/old.md", 0, 0),
      f("Secret/x.md", 0, 0),
    ];
    const kept = selectVaultFiles(files, (p) => p.startsWith("Secret/"));
    expect(kept.map((x) => x.path)).toEqual(["Projects/a.md"]);
  });
});

describe("buildFolderCounts", () => {
  it("counts markdown recursively per top-level folder, alphabetical", () => {
    const files = [f("Work/a.md", 0, 0), f("Work/sub/b.md", 0, 0), f("Personal/c.md", 0, 0)];
    expect(buildFolderCounts(files)).toEqual([
      { name: "Personal", count: 1 },
      { name: "Work", count: 2 },
    ]);
  });
  it("skips notes sitting at the vault root", () => {
    expect(buildFolderCounts([f("root-note.md", 0, 0)])).toEqual([]);
  });
});

describe("buildActivityCounts", () => {
  it("counts a note once per day even if ctime and mtime share a day", () => {
    const t = new Date(2026, 9, 12, 9, 0).getTime();
    const counts = buildActivityCounts([f("a.md", t, t + 3600_000)]);
    expect(counts.get("2026-10-12")).toBe(1);
  });
  it("counts a note on both its creation day and a later modification day", () => {
    const c = new Date(2026, 9, 1, 9, 0).getTime();
    const m = new Date(2026, 9, 12, 9, 0).getTime();
    const counts = buildActivityCounts([f("a.md", c, m)]);
    expect(counts.get("2026-10-01")).toBe(1);
    expect(counts.get("2026-10-12")).toBe(1);
  });
  it("sums multiple notes on the same day", () => {
    const t = new Date(2026, 9, 12, 9, 0).getTime();
    const counts = buildActivityCounts([f("a.md", t, t), f("b.md", t, t)]);
    expect(counts.get("2026-10-12")).toBe(2);
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run tests/vault-data.test.ts`
Expected: FAIL — cannot resolve `../src/vault-data`.

- [ ] **Step 7: Implement `src/vault-data.ts`**

```ts
import { toDateKey } from "./date-utils";

export interface VaultFile { path: string; ctime: number; mtime: number }
export interface FolderCount { name: string; count: number }

export function isMarkdownPath(path: string): boolean;
export function isHiddenPath(path: string): boolean;
export function selectVaultFiles(files: VaultFile[], isIgnored: (path: string) => boolean): VaultFile[];
export function buildFolderCounts(files: VaultFile[]): FolderCount[];
export function buildActivityCounts(files: VaultFile[]): Map<string, number>;
```

Rules the bodies must implement:
- `isMarkdownPath`: extension (text after the last `.`) equals `md`, case-insensitive.
- `isHiddenPath`: any `/`-separated segment starts with `.`.
- `selectVaultFiles`: keep files where `isMarkdownPath(path) && !isHiddenPath(path) && !isIgnored(path)`.
- `buildFolderCounts`: take the first path segment as the folder name; skip files with no `/`. Group and count; return sorted by `name` via `localeCompare`.
- `buildActivityCounts`: for each file, compute `toDateKey(new Date(ctime))` and `toDateKey(new Date(mtime))`; use a per-file `Set` so a day is counted once per file; increment the day's count in the returned `Map`.

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run tests/vault-data.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/date-utils.ts src/vault-data.ts tests/date-utils.test.ts tests/vault-data.test.ts
git commit -m "feat: add vault data logic (folder counts, activity bucketing)"
```

---

### Task 3: Heatmap grid model

**Files:**
- Create: `src/heatmap.ts`
- Test: `tests/heatmap.test.ts`

**Interfaces:**
- Consumes: `toDateKey` from Task 2.
- Produces:
  - `interface HeatmapCell { dateKey: string; date: Date; count: number; level: 0 | 1 | 2 | 3 | 4; isFuture: boolean }`
  - `type HeatmapWeek = HeatmapCell[]` (7 cells, Sunday→Saturday)
  - `interface HeatmapModel { weeks: HeatmapWeek[]; maxCount: number; monthLabels: { columnIndex: number; label: string }[] }`
  - `buildHeatmap(activity: Map<string, number>, today: Date): HeatmapModel`

- [ ] **Step 1: Write failing tests**

`tests/heatmap.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/heatmap.test.ts`
Expected: FAIL — cannot resolve `../src/heatmap`.

- [ ] **Step 3: Implement `src/heatmap.ts`**

Types as in Interfaces. Algorithm (subtle, so pinned here):

```ts
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function buildHeatmap(activity, today) {
  const todayKey = toDateKey(today);
  const maxCount = Math.max(0, ...activity.values());

  // Grid ends on the Saturday of the week containing today.
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  end.setDate(end.getDate() + (6 - end.getDay()));
  const start = new Date(end);
  start.setDate(start.getDate() - (53 * 7 - 1));

  const level = (count) => {
    if (count <= 0 || maxCount === 0) return 0;
    if (count <= maxCount * 0.25) return 1;
    if (count <= maxCount * 0.5) return 2;
    if (count <= maxCount * 0.75) return 3;
    return 4;
  };

  const weeks = [];
  const cursor = new Date(start);
  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateKey = toDateKey(cursor);
      const count = activity.get(dateKey) ?? 0;
      week.push({ dateKey, date: new Date(cursor), count, level: level(count), isFuture: dateKey > todayKey });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const monthLabels = [];
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i][0].date.getMonth() !== weeks[i - 1][0].date.getMonth()) {
      monthLabels.push({ columnIndex: i, label: MONTHS[weeks[i][0].date.getMonth()] });
    }
  }

  return { weeks, maxCount, monthLabels };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/heatmap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/heatmap.ts tests/heatmap.test.ts
git commit -m "feat: add heatmap grid model"
```

---

### Task 4: DOM rendering (tiles + heatmap)

**Files:**
- Create: `src/render.ts`
- Test: `tests/render.test.ts`

**Interfaces:**
- Consumes: `FolderCount` (Task 2), `HeatmapModel`, `HeatmapCell` (Task 3).
- Produces:
  - `renderTiles(container: HTMLElement, counts: FolderCount[]): void`
  - `renderHeatmap(container: HTMLElement, model: HeatmapModel): void`
  - `renderDashboard(container: HTMLElement, counts: FolderCount[], model: HeatmapModel): void`

DOM contract (asserted by tests): see the test below. `renderDashboard` calls `renderTiles` then `renderHeatmap`. No Obsidian imports.

- [ ] **Step 1: Write failing tests**

`tests/render.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/render.test.ts`
Expected: FAIL — cannot resolve `../src/render`.

- [ ] **Step 3: Implement `src/render.ts`**

Rules:
- `renderTiles`: clear `container`; create `div.dashboard-tiles`. If `counts` is empty, append `div.dashboard-empty` with text `No folders yet`. Otherwise, for each count append `div.dashboard-tile` containing `div.dashboard-tile-name` (folder name) and `div.dashboard-tile-count` (count as string).
- `renderHeatmap`: clear `container`; create `div.dashboard-heatmap` → `div.dashboard-heatmap-months` (one `span` per `monthLabels` entry, positioned by `columnIndex` via `style.gridColumnStart`) and `div.dashboard-heatmap-grid`. For each cell in `model.weeks` (flattened, week-by-week), append `div.dashboard-cell` with classes `level-${cell.level}`, plus `is-future` when `cell.isFuture`; set `data-date` to `dateKey` and `title` to `` `${count} notes on ${dateKey}` ``.
- `renderDashboard`: call `renderTiles(container, counts)` then `renderHeatmap(container, model)`.
- Use only `document.createElement` / DOM APIs; no `innerHTML` with data.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/render.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 6: Commit**

```bash
git add src/render.ts tests/render.test.ts
git commit -m "feat: render folder tiles and activity heatmap"
```

---

### Task 5: DashboardView and plugin wiring

**Files:**
- Create: `src/view.ts`
- Modify: `src/main.ts`
- Modify: `styles.css` (minimal layout hooks needed for the view to be usable before Task 6)

**Interfaces:**
- Consumes: `selectVaultFiles`, `buildFolderCounts`, `buildActivityCounts` (Task 2); `buildHeatmap` (Task 3); `renderDashboard` (Task 4); `DashboardPlugin`.
- Produces:
  - `export const DASHBOARD_VIEW_TYPE = "dashboard-view";` in `src/view.ts`
  - `export class DashboardView extends ItemView` with `constructor(leaf: WorkspaceLeaf, plugin: DashboardPlugin)`, `getViewType()`, `getDisplayText()`, `getIcon()`, `onOpen()`, `onClose()`, and `refresh(): void`.
  - `DashboardPlugin` gains `activateView(): Promise<void>` and `refreshDashboards(): void`.

- [ ] **Step 1: Implement `src/view.ts`**

`DashboardView`:
- `getViewType()` returns `DASHBOARD_VIEW_TYPE`; `getDisplayText()` returns `"Dashboard"`; `getIcon()` returns `"layout-dashboard"`.
- `onOpen()`: call `this.activate()`/`await super.onOpen()`; set the container class; `this.addAction("refresh-cw", "Refresh", () => this.refresh())`; then `this.refresh()`.
- `refresh()`: build the data pipeline and render into `this.contentEl`:

```ts
const files = this.app.vault.getMarkdownFiles().map((f) => ({
  path: f.path, ctime: f.stat.ctime, mtime: f.stat.mtime,
}));
const isIgnored = (p: string) => {
  const mc: any = this.app.metadataCache;
  return typeof mc.isUserIgnored === "function" ? mc.isUserIgnored(p) : false;
};
const selected = selectVaultFiles(files, isIgnored);
const counts = buildFolderCounts(selected);
const activity = buildActivityCounts(selected);
const model = buildHeatmap(activity, new Date());
this.contentEl.empty();
renderDashboard(this.contentEl, counts, model);
```

- `onClose()`: `this.contentEl.empty()`.

- [ ] **Step 2: Wire up `src/main.ts`**

- `onload()`:
  - `this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this));`
  - `this.addRibbonIcon("layout-dashboard", "Open dashboard", () => this.activateView());`
  - `this.addCommand({ id: "open-dashboard", name: "Open dashboard", callback: () => this.activateView() });`
  - Register refresh triggers once (plugin-scoped, so no duplicate listeners): `this.registerEvent(this.app.vault.on("create", handler))`, `.on("modify")`, `.on("delete")`, `.on("rename")`, each calling a debounced `this.refreshDashboards()`. Also `this.registerDomEvent(window, "focus", () => this.refreshDashboards())`.
- A local `debounce(fn, ms=1000)` helper.
- `activateView()`: if a dashboard leaf exists, reveal it (`this.app.workspace.revealLeaf`); otherwise `this.app.workspace.getLeaf("tab")` then `leaf.setViewState({ type: DASHBOARD_VIEW_TYPE, active: true })`.
- `refreshDashboards()`: `this.app.workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE).forEach((leaf) => (leaf.view as DashboardView)?.refresh?.());`

- [ ] **Step 3: Add minimal `styles.css` hooks**

Add enough for usability now (final styling is Task 6): `.dashboard-tiles { display: flex; flex-wrap: wrap; gap: 8px; }`, `.dashboard-tile { padding: 8px 12px; }`, `.dashboard-heatmap-grid { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 12px); gap: 2px; }`, `.dashboard-cell { width: 12px; height: 12px; }`.

- [ ] **Step 4: Build and typecheck**

Run: `npm run build`
Expected: no TypeScript errors; `main.js` regenerated.

- [ ] **Step 5: Manual verification in Obsidian**

Symlink or copy the folder into `<vault>/.obsidian/plugins/obsidian-dashboard/`, enable the plugin, then:
- Ribbon icon and the "Open dashboard" command open the Dashboard tab.
- Tiles show one per top-level folder with a count.
- The heatmap shows 53 columns; today's cell is present; hovering a cell shows its count.
- Editing/saving a note updates the tiles/heatmap within ~1s.
- The refresh action button re-renders.

Expected: all of the above hold.

- [ ] **Step 6: Commit**

```bash
git add src/view.ts src/main.ts styles.css
git commit -m "feat: add dashboard view and plugin wiring"
```

---

### Task 6: Theme-aware styling

**Files:**
- Modify: `styles.css`

**Interfaces:**
- Consumes: the DOM classes from Task 4 (`.dashboard-tiles`, `.dashboard-tile`, `.dashboard-tile-name`, `.dashboard-tile-count`, `.dashboard-empty`, `.dashboard-heatmap`, `.dashboard-heatmap-months`, `.dashboard-heatmap-grid`, `.dashboard-cell`, `.level-0..4`, `.is-future`).
- Produces: final visual styling. No code interface changes.

- [ ] **Step 1: Write the styles**

- Tiles: card look using Obsidian theme variables (`--background-secondary`, `--background-modifier-border`, `--text-normal`, `--text-muted`); folder name muted, count prominent.
- Heatmap: empty cells use `var(--background-modifier-border)`; `.level-1..4` use a GitHub-like green scale with dark-theme overrides via `.theme-dark`.
- `.is-future { visibility: hidden; }`.
- Horizontal scroll on narrow widths: `.dashboard-heatmap { overflow-x: auto; }`.
- Month labels grid aligned with the column grid.

- [ ] **Step 2: Manual verification**

Reload the plugin in Obsidian and toggle between a light and a dark theme.
Expected: tiles and heatmap are legible in both; empty cells are subtle; the four activity levels are distinguishable.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "style: theme-aware dashboard styling"
```

---

### Task 7: README and platform caveat

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: user-facing docs.

- [ ] **Step 1: Write `README.md`**

Cover: what the plugin does, how to open the Dashboard, that counts are markdown-only and folders are top-level, that activity is derived from current file timestamps and is not stored history, and the platform caveat: on Linux `ctime` is the inode change time and often tracks `mtime`, so "created" may effectively equal "modified".

- [ ] **Step 2: Run the full test suite and build**

Run: `npm test && npm run build`
Expected: tests PASS; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README and activity caveat"
```

---

## Self-Review Notes

- Spec coverage: placement (Task 5), folder tiles + recursion + markdown-only + hidden-folder exclusion (Tasks 2, 4), 53-week heatmap with local-day attribution and de-dup (Tasks 2, 3), auto-scaled 5 levels (Task 3), refresh on open/button/vault-change/focus (Task 5), theme-aware styling (Task 6), Linux ctime caveat (Task 7).
- Type consistency: `VaultFile`/`FolderCount` (Task 2), `HeatmapModel`/`HeatmapCell` (Task 3), `renderDashboard` (Task 4), `DashboardView`/`DASHBOARD_VIEW_TYPE` (Task 5) are used with the same names throughout.
- Review Focus items 1–5 are each backed by a test in Tasks 2/3/4 as noted.
