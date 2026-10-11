import type { FolderCount } from "./vault-data";
import type { HeatmapModel } from "./heatmap";

function clear(container: HTMLElement): void {
	container.innerHTML = "";
}

export function renderTiles(container: HTMLElement, counts: FolderCount[]): void {
	clear(container);
	const tilesEl = document.createElement("div");
	tilesEl.className = "dashboard-tiles";

	if (counts.length === 0) {
		const empty = document.createElement("div");
		empty.className = "dashboard-empty";
		empty.textContent = "No folders yet";
		tilesEl.appendChild(empty);
	} else {
		for (const { name, count } of counts) {
			const tile = document.createElement("div");
			tile.className = "dashboard-tile";

			const nameEl = document.createElement("div");
			nameEl.className = "dashboard-tile-name";
			nameEl.textContent = name;

			const countEl = document.createElement("div");
			countEl.className = "dashboard-tile-count";
			countEl.textContent = String(count);

			tile.appendChild(nameEl);
			tile.appendChild(countEl);
			tilesEl.appendChild(tile);
		}
	}

	container.appendChild(tilesEl);
}

export function renderHeatmap(container: HTMLElement, model: HeatmapModel): void {
	clear(container);
	const heatmap = document.createElement("div");
	heatmap.className = "dashboard-heatmap";

	const months = document.createElement("div");
	months.className = "dashboard-heatmap-months";
	for (const { columnIndex, label } of model.monthLabels) {
		const span = document.createElement("span");
		span.className = "dashboard-heatmap-month";
		span.textContent = label;
		span.style.gridColumnStart = String(columnIndex);
		months.appendChild(span);
	}
	heatmap.appendChild(months);

	const grid = document.createElement("div");
	grid.className = "dashboard-heatmap-grid";
	for (const week of model.weeks) {
		for (const cell of week) {
			const cellEl = document.createElement("div");
			cellEl.className = `dashboard-cell level-${cell.level}`;
			if (cell.isFuture) cellEl.classList.add("is-future");
			cellEl.setAttribute("data-date", cell.dateKey);
			cellEl.setAttribute("title", `${cell.count} ${cell.count === 1 ? "note" : "notes"} on ${cell.dateKey}`);
			grid.appendChild(cellEl);
		}
	}
	heatmap.appendChild(grid);

	container.appendChild(heatmap);
}

export function renderDashboard(container: HTMLElement, counts: FolderCount[], model: HeatmapModel): void {
	clear(container);
	const root = document.createElement("div");
	root.className = "dashboard";

	const tilesSection = document.createElement("div");
	tilesSection.className = "dashboard-tiles-section";
	renderTiles(tilesSection, counts);

	const heatmapSection = document.createElement("div");
	heatmapSection.className = "dashboard-heatmap-section";
	renderHeatmap(heatmapSection, model);

	root.appendChild(tilesSection);
	root.appendChild(heatmapSection);
	container.appendChild(root);
}