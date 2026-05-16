import { App, TFile } from 'obsidian';

export interface GraphNode {
	id: string;       // file path — used as the Cytoscape node ID
	label: string;    // file basename — display text
	type: 'active' | 'upstream' | 'downstream';
	distance: number; // hop count from the active file (0 = active)
}

export interface GraphEdge {
	id: string;
	source: string; // file path
	target: string; // file path
}

export interface GraphData {
	nodes: GraphNode[];
	edges: GraphEdge[];
}

// ── Public API ─────────────────────────────────────────────────────────────

export function buildGraph(activeFile: TFile, depth: number, app: App): GraphData {
	const resolvedLinks = app.metadataCache.resolvedLinks;

	// Pre-build path → TFile lookup from vault for O(1) access.
	const fileMap = new Map<string, TFile>();
	for (const f of app.vault.getMarkdownFiles()) {
		fileMap.set(f.path, f);
	}

	// Inverted resolvedLinks: tgtPath → Set<srcPath>
	const backlinkIndex = buildBacklinkIndex(resolvedLinks);

	const nodes = new Map<string, GraphNode>();
	const edges: GraphEdge[] = [];
	const edgeSet = new Set<string>();
	const visited = new Set<string>();

	nodes.set(activeFile.path, {
		id: activeFile.path,
		label: truncate(activeFile.basename),
		type: 'active',
		distance: 0,
	});
	visited.add(activeFile.path);

	// Upstream BFS — traverse backlinks: neighbor LINKS TO the current node.
	bfs(
		[activeFile.path],
		depth,
		(path) => Array.from(backlinkIndex.get(path) ?? []),
		'upstream',
		(current, neighbor) => [neighbor, current] as [string, string],
		fileMap,
		nodes,
		edges,
		edgeSet,
		visited,
	);

	// Downstream BFS — traverse forward links: current node LINKS TO neighbor.
	bfs(
		[activeFile.path],
		depth,
		(path) => Object.keys(resolvedLinks[path] ?? {}),
		'downstream',
		(current, neighbor) => [current, neighbor] as [string, string],
		fileMap,
		nodes,
		edges,
		edgeSet,
		visited,
	);

	return { nodes: Array.from(nodes.values()), edges };
}

// ── Internals ──────────────────────────────────────────────────────────────

function buildBacklinkIndex(
	resolvedLinks: Record<string, Record<string, number>>,
): Map<string, Set<string>> {
	const index = new Map<string, Set<string>>();
	for (const srcPath of Object.keys(resolvedLinks)) {
		const targets = resolvedLinks[srcPath];
		if (!targets) continue;
		for (const tgtPath of Object.keys(targets)) {
			let set = index.get(tgtPath);
			if (!set) { set = new Set(); index.set(tgtPath, set); }
			set.add(srcPath);
		}
	}
	return index;
}

function bfs(
	startPaths: string[],
	depth: number,
	getNeighbors: (path: string) => string[],
	nodeType: 'upstream' | 'downstream',
	edgeDirection: (current: string, neighbor: string) => [string, string],
	fileMap: Map<string, TFile>,
	nodes: Map<string, GraphNode>,
	edges: GraphEdge[],
	edgeSet: Set<string>,
	visited: Set<string>,
): void {
	let currentLevel = startPaths;

	for (let d = 1; d <= depth; d++) {
		const nextLevel: string[] = [];

		for (const currentPath of currentLevel) {
			for (const neighborPath of getNeighbors(currentPath)) {
				// Always record the edge (even if the neighbor was already visited
				// via a shorter path — we still want to show that link).
				const [src, tgt] = edgeDirection(currentPath, neighborPath);
				const edgeId = `${src}→${tgt}`;
				if (!edgeSet.has(edgeId)) {
					edgeSet.add(edgeId);
					edges.push({ id: edgeId, source: src, target: tgt });
				}

				if (!visited.has(neighborPath)) {
					visited.add(neighborPath);
					const file = fileMap.get(neighborPath);
					if (file) {
						nodes.set(neighborPath, {
							id: neighborPath,
							label: truncate(file.basename),
							type: nodeType,
							distance: d,
						});
						nextLevel.push(neighborPath);
					}
				}
			}
		}

		currentLevel = nextLevel;
		if (currentLevel.length === 0) break;
	}
}

function truncate(name: string): string {
	return name.length > 22 ? name.slice(0, 19) + '…' : name;
}
