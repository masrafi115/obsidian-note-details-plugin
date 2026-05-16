export interface ParsedHeading {
	level: 1 | 2 | 3;
	text: string;
	line: number;
}

export interface ParsedCrossVaultRef {
	vault: string;
	file: string;
	raw: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function stripFrontmatter(content: string): string {
	if (!content.startsWith('---')) return content;
	const end = content.indexOf('\n---', 3);
	if (end === -1) return content;
	return content.slice(end + 4);
}

// Trim trailing punctuation that is not part of the URL itself.
function trimTrailingPunct(url: string): string {
	return url.replace(/[.,;:!?)]+$/, '');
}

// ── Parsers ────────────────────────────────────────────────────────────────

export function parseHeadings(content: string): ParsedHeading[] {
	const results: ParsedHeading[] = [];
	const lines = content.split('\n');
	let inFencedBlock = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === undefined) continue;

		// Track fenced code blocks so we don't parse headings inside them.
		if (/^(`{3,}|~{3,})/.test(line)) {
			inFencedBlock = !inFencedBlock;
			continue;
		}
		if (inFencedBlock) continue;

		const match = /^(#{1,3})\s+(.+)/.exec(line);
		if (!match) continue;

		const hashes = match[1];
		const text = match[2];
		if (!hashes || !text) continue;

		results.push({
			level: hashes.length as 1 | 2 | 3,
			text: text.trim(),
			line: i,
		});
	}

	return results;
}

export function parseExternalUrls(content: string): string[] {
	const body = stripFrontmatter(content);
	const seen = new Set<string>();
	const results: string[] = [];
	const regex = /https?:\/\/[^\s\)\]\'"<>]+/g;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(body)) !== null) {
		const raw = match[0];
		if (!raw) continue;
		const url = trimTrailingPunct(raw);
		if (!seen.has(url)) {
			seen.add(url);
			results.push(url);
		}
	}

	return results;
}

export function parseCrossVaultRefs(content: string): ParsedCrossVaultRef[] {
	const seen = new Set<string>();
	const results: ParsedCrossVaultRef[] = [];
	const regex = /obsidian:\/\/open\?[^\s\)\]\'"<>]+/g;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(content)) !== null) {
		const raw = match[0];
		if (!raw) continue;
		const uri = trimTrailingPunct(raw);
		if (seen.has(uri)) continue;
		seen.add(uri);

		try {
			const url = new URL(uri);
			const vault = decodeURIComponent(url.searchParams.get('vault') ?? '');
			const file  = decodeURIComponent(url.searchParams.get('file')  ?? '');
			if (vault || file) {
				results.push({ vault, file, raw: uri });
			}
		} catch {
			// Skip malformed URIs
		}
	}

	return results;
}
