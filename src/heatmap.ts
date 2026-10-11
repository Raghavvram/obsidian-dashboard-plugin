import { toDateKey } from "./date-utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatmapCell {
	dateKey: string;
	date: Date;
	count: number;
	level: HeatmapLevel;
	isFuture: boolean;
	isPadding?: boolean;
}

export type HeatmapWeek = HeatmapCell[];

export interface MonthLabel {
	columnIndex: number;
	label: string;
}

export interface HeatmapModel {
	weeks: HeatmapWeek[];
	maxCount: number;
	monthLabels: MonthLabel[];
}

export function buildHeatmap(activity: Map<string, number>, today: Date): HeatmapModel {
	const todayKey = toDateKey(today);

	// Grid ends on the Saturday of the week containing today.
	const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	end.setDate(end.getDate() + (6 - end.getDay()));
	const start = new Date(end);
	start.setDate(start.getDate() - (53 * 7 - 1));

	// Scale only against days actually in the window so an older spike
	// doesn't wash out the visible heatmap.
	const startKey = toDateKey(start);
	const endKey = toDateKey(end);
	let maxCount = 0;
	for (const [key, count] of activity) {
		if (count > maxCount && key >= startKey && key <= endKey) maxCount = count;
	}

	const level = (count: number): HeatmapLevel => {
		if (count <= 0 || maxCount === 0) return 0;
		if (count <= maxCount * 0.25) return 1;
		if (count <= maxCount * 0.5) return 2;
		if (count <= maxCount * 0.75) return 3;
		return 4;
	};

	const weeks: HeatmapWeek[] = [];
	const cursor = new Date(start);
	for (let w = 0; w < 53; w++) {
		const week: HeatmapWeek = [];
		for (let d = 0; d < 7; d++) {
			const dateKey = toDateKey(cursor);
			const count = activity.get(dateKey) ?? 0;
			week.push({ dateKey, date: new Date(cursor), count, level: level(count), isFuture: dateKey > todayKey });
			cursor.setDate(cursor.getDate() + 1);
		}
		weeks.push(week);
	}

	const monthLabels: MonthLabel[] = [];
	for (let i = 1; i < weeks.length; i++) {
		if (weeks[i][0].date.getMonth() !== weeks[i - 1][0].date.getMonth()) {
			monthLabels.push({ columnIndex: i + 1, label: MONTHS[weeks[i][0].date.getMonth()] });
		}
	}

	return { weeks, maxCount, monthLabels };
}

export function buildYearHeatmap(activity: Map<string, number>, year: number, today: Date): HeatmapModel {
	const jan1 = new Date(year, 0, 1);
	const dec31 = new Date(year, 11, 31);

	// Align to Sunday-start weeks and pad the surrounding days as empty cells.
	const start = new Date(jan1);
	start.setDate(start.getDate() - jan1.getDay());
	const end = new Date(dec31);
	end.setDate(end.getDate() + (6 - dec31.getDay()));

	const jan1Key = toDateKey(jan1);
	const dec31Key = toDateKey(dec31);

	let maxCount = 0;
	for (const [key, count] of activity) {
		if (count > maxCount && key >= jan1Key && key <= dec31Key) maxCount = count;
	}

	const level = (count: number): HeatmapLevel => {
		if (count <= 0 || maxCount === 0) return 0;
		if (count <= maxCount * 0.25) return 1;
		if (count <= maxCount * 0.5) return 2;
		if (count <= maxCount * 0.75) return 3;
		return 4;
	};

	const weeks: HeatmapWeek[] = [];
	const cursor = new Date(start);
	while (cursor <= end) {
		const week: HeatmapWeek = [];
		for (let d = 0; d < 7; d++) {
			const dateKey = toDateKey(cursor);
			const isPadding = dateKey < jan1Key || dateKey > dec31Key;
			const count = isPadding ? 0 : (activity.get(dateKey) ?? 0);
			week.push({
				dateKey: isPadding ? "" : dateKey,
				date: new Date(cursor),
				count,
				level: isPadding ? 0 : level(count),
				isFuture: !isPadding && dateKey > toDateKey(today),
				isPadding,
			});
			cursor.setDate(cursor.getDate() + 1);
		}
		weeks.push(week);
	}

	const monthLabels: MonthLabel[] = [];
	for (let i = 1; i < weeks.length; i++) {
		if (weeks[i][0].date.getMonth() !== weeks[i - 1][0].date.getMonth()) {
			monthLabels.push({ columnIndex: i + 1, label: MONTHS[weeks[i][0].date.getMonth()] });
		}
	}

	return { weeks, maxCount, monthLabels };
}