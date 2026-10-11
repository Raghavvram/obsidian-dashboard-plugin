import { Plugin } from "obsidian";
import { DashboardView, DASHBOARD_VIEW_TYPE } from "./view";

export default class DashboardPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerView(DASHBOARD_VIEW_TYPE, (leaf) => new DashboardView(leaf, this));

		this.addRibbonIcon("layout-dashboard", "Open dashboard", () => {
			void this.activateView();
		});

		this.addCommand({
			id: "open-dashboard",
			name: "Open dashboard",
			callback: () => {
				void this.activateView();
			},
		});

		const refresh = debounce(() => this.refreshDashboards(), 1000);
		this.registerEvent(this.app.vault.on("create", refresh));
		this.registerEvent(this.app.vault.on("modify", refresh));
		this.registerEvent(this.app.vault.on("delete", refresh));
		this.registerEvent(this.app.vault.on("rename", refresh));
		this.registerDomEvent(window, "focus", () => this.refreshDashboards());
	}

	async activateView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE);
		if (existing.length > 0) {
			await this.app.workspace.revealLeaf(existing[0]);
			return;
		}
		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.setViewState({ type: DASHBOARD_VIEW_TYPE, active: true });
		await this.app.workspace.revealLeaf(leaf);
	}

	refreshDashboards(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(DASHBOARD_VIEW_TYPE)) {
			(leaf.view as DashboardView)?.refresh?.();
		}
	}
}

function debounce(fn: () => void, ms: number): () => void {
	let timer: number | undefined;
	return () => {
		window.clearTimeout(timer);
		timer = window.setTimeout(fn, ms);
	};
}