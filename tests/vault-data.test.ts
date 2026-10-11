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