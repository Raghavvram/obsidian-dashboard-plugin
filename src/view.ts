import { ItemView, TFolder, WorkspaceLeaf } from "obsidian";
import type DashboardPlugin from "./main";
import { buildActivityCounts, buildFolderCounts, availableYears, selectVaultFiles } from "./vault-data";
import { buildHeatmap, buildYearHeatmap } from "./heatmap";
import { renderDashboard } from "./render";

export const DASHBOARD_VIEW_TYPE = "dashboard-view";

export class DashboardView extends ItemView {
	private plugin: DashboardPlugin;
	private selectedYear: number | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: DashboardPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return DASHBOARD_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Dashboard";
	}

	getIcon(): string {
		return "layout-dashboard";
	}

	async onOpen(): Promise<void> {
		await super.onOpen();
		this.containerEl.classList.add("dashboard-view-container");
		this.addAction("refresh-cw", "Refresh", () => this.refresh());
		this.refresh();
	}

	async onClose(): Promise<void> {
		await super.onClose();
		this.contentEl.empty();
	}

	refresh(): void {
		const files = this.app.vault.getMarkdownFiles().map((f) => ({
			path: f.path,
			ctime: f.stat.ctime,
			mtime: f.stat.mtime,
		}));
		const isIgnored = (p: string) => {
			const mc: any = this.app.metadataCache;
			return typeof mc.isUserIgnored === "function" ? mc.isUserIgnored(p) : false;
		};
		const selected = selectVaultFiles(files, isIgnored);
		const folderNames = this.app.vault.getRoot().children
			.filter((child): child is TFolder => child instanceof TFolder && !child.name.startsWith("."))
			.map((folder) => folder.name);
		const counts = buildFolderCounts(selected, folderNames);
		const activity = buildActivityCounts(selected);
		const years = availableYears(activity);
		if (this.selectedYear !== null && !years.includes(this.selectedYear)) {
			this.selectedYear = null;
		}
		const model = this.selectedYear === null
			? buildHeatmap(activity, new Date())
			: buildYearHeatmap(activity, this.selectedYear, new Date());
		this.contentEl.empty();
		renderDashboard(this.contentEl, counts, model, {
			years,
			selectedYear: this.selectedYear,
			onChange: (year) => {
				this.selectedYear = year;
				this.refresh();
			},
		});
	}
}