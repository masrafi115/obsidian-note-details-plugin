import { App, TFile } from 'obsidian';

export interface NoteScore {
	file: TFile;
	inbound: number;   // other notes whose wikilinks point TO this note
	outbound: number;  // wikilinks FROM this note to other notes
}

export type SortMode = 'inbound' | 'outbound';

// ── Scoring ────────────────────────────────────────────────────────────────

export function computeScores(app: App): NoteScore[] {
	const files = app.vault.getMarkdownFiles();
	const resolvedLinks = app.metadataCache.resolvedLinks;

	// First pass: build an inbound-count map from the full resolvedLinks graph.
	// resolvedLinks[srcPath][tgtPath] = number of times src links to tgt.
	const inboundCount = new Map<string, number>();

	for (const srcPath of Object.keys(resolvedLinks)) {
		const targets = resolvedLinks[srcPath];
		if (!targets) continue;
		for (const tgtPath of Object.keys(targets)) {
			inboundCount.set(tgtPath, (inboundCount.get(tgtPath) ?? 0) + 1);
		}
	}

	// Second pass: map each file to its scores.
	return files.map(file => {
		const outTargets = resolvedLinks[file.path];
		return {
			file,
			inbound:  inboundCount.get(file.path) ?? 0,
			outbound: outTargets ? Object.keys(outTargets).length : 0,
		};
	});
}

// ── Filtering + Sorting ────────────────────────────────────────────────────

export function filterAndSort(
	scores: NoteScore[],
	mode: SortMode,
	folderPrefix: string,
	limit: number,
): NoteScore[] {
	const prefix = folderPrefix.trim().replace(/^\/+/, '');

	const filtered = prefix
		? scores.filter(s => s.file.path.startsWith(prefix))
		: scores;

	return filtered
		.slice()
		.sort((a, b) =>
			mode === 'inbound'
				? b.inbound  - a.inbound
				: b.outbound - a.outbound
		)
		.slice(0, limit);
}
