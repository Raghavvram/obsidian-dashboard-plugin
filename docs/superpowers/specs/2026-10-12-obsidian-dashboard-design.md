# Obsidian Dashboard Plugin — Design

Date: 2026-10-12
Status: Awaiting approval

## Intent

An Obsidian plugin that adds a **Dashboard** view: a full tab showing an
at-a-glance summary of the vault — one tile per top-level folder with a
count of the markdown notes inside it, and a GitHub-style activity
heatmap of when notes were created or modified.

This is being built from scratch; the project directory is currently
empty.

## Why

To see, in one place, how the vault is distributed across folders and
how active note-writing has been over the past year — without leaving
Obsidian or digging through the file explorer.

## Goals

- A Dashboard that opens as a full tab, triggered from the ribbon and
  from a command.
- A tile per top-level folder showing a recursive count of markdown
  notes inside it.
- A GitHub-style heatmap of the last ~12 months, where each day's
  intensity reflects the number of markdown notes created or modified
  that day.
- Light, dependency-free, offline; theme-aware styling.

## Non-Goals

- No stored activity history. The heatmap is computed fresh from the
  vault's current file timestamps every time it renders.
- No settings panel in the first version.
- No per-file breakdown, search, or filtering.
- No Git integration; "activity" is Obsidian file activity only.
- No counting of non-markdown files.
- No multi-vault support (one vault per Obsidian window).
- No mobile support.

## Anti-Goals

- **Must not rewrite its own past.** Because there is no stored history,
  the heatmap is explicitly a snapshot of current timestamps and will
  change as files are re-touched. This is accepted, but the UI must not
  imply a durable contribution record.
- Must not introduce a heavyweight UI framework or network calls.
- Must not block the UI while scanning a large vault.

## Constraints

- Standard Obsidian plugin layout: `manifest.json`, `main.js` (bundled),
  `styles.css`.
- TypeScript, bundled with esbuild.
- Works in both light and dark themes.
- No external runtime dependencies (Obsidian API + plain DOM/CSS only).

## Decisions Made

- **Placement:** full tab (custom `ItemView`), opened via a ribbon icon
  and a command.
- **Platform:** desktop only. `manifest.json` sets `isDesktopOnly: true`;
  mobile is out of scope, so hover tooltips are acceptable.
- **Folder tiles:** one per top-level folder in the vault, alphabetical.
  Each tile's count is recursive — all markdown notes in that folder and
  its subfolders. Notes sitting directly at the vault root are not shown
  in any tile.
- **"Markdown note":** a vault file whose extension is `md`.
- **Folder scope / filtering:** hidden and system folders whose names begin
  with `.` (`.obsidian`, `.trash`, etc.) are excluded from the tiles and
  from all counts and activity. Obsidian's `userIgnoreFilters` are
  respected. (Builder call.)
- **Recency window:** heatmap covers the last 53 weeks ending today,
  columns = weeks (Sunday-start, like GitHub), rows = days of the week.
  The grid always renders 53 week-columns; the current (partial) week is
  the last column, and days after today in it render as empty (level 0)
  placeholders, GitHub-style. (Builder call.)
- **Day attribution:** a markdown note counts toward a day if its
  creation date OR its modification date (local time) falls on that day.
  A note that was created and modified on the same day counts once for
  that day (per-day de-duplication).
- **Intensity scaling:** 5 levels (0–4), auto-scaled to the busiest day
  in the window: 0 = none, 1 = up to 25% of max, 2 = up to 50%, 3 = up to
  75%, 4 = above 75%. Re-scaled on each render.
- **Refresh:** renders on open; a manual refresh button; automatic
  re-render on vault changes (create/modify/delete/rename) debounced
  (≈1s) to avoid thrashing on bulk operations; and a re-render on window
  focus so a view left open across midnight isn't stale. (Builder call.)
- **Performance:** the scan and date bucketing run synchronously on the
  debounced refresh tick; rendering the heatmap's DOM yields between
  frames. No Web Worker (it can't call the Vault API). Target: smooth on
  typical vaults of up to a few thousand notes. (Builder call.)
- **Colors:** theme-aware. Empty cells use an Obsidian theme variable;
  activity cells use a green scale matching GitHub's palette, with
  dark-mode variants. Exact values are the builder's call.
- **Styling/layout:** responsive grid for tiles; the heatmap may scroll
  horizontally on narrow screens.

## Data & Rendering Notes (builder reference)

- Enumerate top-level folders from the vault root's children.
- Walk each folder recursively (via `Vault.getFiles()` /
  `file.parent`) and count `.md` files.
- Build a `Map<YYYY-MM-DD, Set<path>>` from every markdown file's
  `stat.ctime` and `stat.mtime`, bucketed by local calendar date, so a
  note contributes at most once per day.
- Known caveat: on Linux, `ctime` is the inode change time and often
  tracks `mtime`, so "created" may effectively equal "modified" on some
  platforms. Document this in the README; not a blocker.
- Render tiles and heatmap as plain DOM elements with CSS classes for
  intensity levels; hover tooltips show date and count.

## Left to the Builder

- Exact CSS values, typography, spacing, icon choice, and dark/light
  shades.
- Plugin metadata: id, name, author, description, `minAppVersion`.
- Project scaffolding details (scripts, tsconfig, esbuild config).
- Whether/how to test (unit tests for the date-bucketing and counting
  logic are encouraged; no test framework is mandated).
- Hover-tooltip implementation (title attribute vs. custom element).
- README contents.
