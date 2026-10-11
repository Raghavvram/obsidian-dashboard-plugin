import { toDateKey } from "./date-utils";

export interface VaultFile { path: string; ctime: number; mtime: number }
export interface FolderCount { name: string; count: number }

export function isMarkdownPath(path: string): boolean {
	const dot = path.lastIndexOf(".");
	if (dot === -1) return false;
	return path.slice(dot + 1).toLowerCase() === "md";
}

export function isHiddenPath(path: string): boolean {
	return path.split("/").some((segment) => segment.startsWith("."));
}

export function selectVaultFiles(files: VaultFile[], isIgnored: (path: string) => boolean): VaultFile[] {
	return files.filter((file) =>
		isMarkdownPath(file.path) && !isHiddenPath(file.path) && !isIgnored(file.path),
	);
}

export function buildFolderCounts(files: VaultFile[], folderNames: string[] = []): FolderCount[] {
	const counts = new Map<string, number>();
	for (const name of folderNames) {
		counts.set(name, 0);
	}
	for (const file of files) {
		const slash = file.path.indexOf("/");
		if (slash === -1) continue;
		const name = file.path.slice(0, slash);
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export function buildActivityCounts(files: VaultFile[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const file of files) {
		const days = new Set<string>([
			toDateKey(new Date(file.ctime)),
			toDateKey(new Date(file.mtime)),
		]);
		for (const day of days) {
			counts.set(day, (counts.get(day) ?? 0) + 1);
		}
	}
	return counts;
}