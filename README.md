# Dashboard

An Obsidian plugin that adds a **Dashboard** view — an at-a-glance summary
of your vault, showing:

- One **tile per top-level folder**, with a count of the markdown notes
  inside it (including notes in subfolders).
- A **GitHub-style activity heatmap** of the past ~12 months, where each
  day's intensity reflects how many markdown notes were created or
  modified that day.

## How to open it

Click the dashboard ribbon icon, run the **"Open dashboard"** command, or
use the refresh action in the view's header. From the command palette:
`Dashboard: Open dashboard`.

## How counts work

- Only markdown notes (`.md`) are counted. Images, PDFs, and other files
  are ignored.
- Tiles cover top-level folders only; notes sitting at the vault root are
  not shown in any tile.
- Hidden and system folders (`.obsidian`, `.trash`, …) and files matched
  by your ignore filters are excluded from tiles and from the heatmap.

## How the heatmap works

- Covers the last 53 weeks, columns = weeks, rows = days of the week.
- A day's intensity is the number of distinct markdown notes created or
  modified that day. A note created and modified on the same day counts
  once.
- The heatmap is a **snapshot of the vault's current file timestamps** —
  it is recomputed on every refresh and does not store history. Editing a
  note again on a later day will overwrite its earlier activity.

### Platform caveat

On Linux, a file's `ctime` is the *inode change time*, which often tracks
`mtime`. As a result, a note's "created" day may effectively read the same
as its "modified" day. On Windows/macOS `ctime` reflects true creation.

## Development

```
npm install     # install dependencies
npm run dev     # watch-mode build to main.js
npm run build   # typecheck + production build
npm test        # run the test suite (vitest)
```

## License

MIT