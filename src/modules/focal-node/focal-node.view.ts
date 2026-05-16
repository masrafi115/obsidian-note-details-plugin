import cytoscape from 'cytoscape';
import { GraphData, GraphNode } from './graph-builder';

const NODE_COLORS: Record<string, string> = {
	active:     '#e8b000',
	upstream:   '#3b82f6',
	downstream: '#22c55e',
};

const NODE_SIZE_ACTIVE   = 42;
const NODE_SIZE_MAX      = 32;
const NODE_SIZE_MIN      = 18;
const NODE_OPACITY_MAX   = 0.95;
const NODE_OPACITY_MIN   = 0.30;

type NavigateCallback = (fileId: string) => void;
type DepthChangeCallback = (depth: number) => void;

export class FocalNodeView {
	readonly el: HTMLElement;

	private containerEl!: HTMLElement;
	private depthDisplay!: HTMLElement;
	private depthValue = 1;
	private cy: cytoscape.Core | null = null;

	constructor(
		private onDepthChange: DepthChangeCallback,
		private onNavigate: NavigateCallback,
	) {
		this.el = document.createElement('div');
		this.el.addClass('fn-view');
		this.buildControls();
		this.containerEl = this.el.createDiv({ cls: 'fn-graph-container' });
		this.showEmpty('Open a note to see its connections.');
	}

	// ── Public API ───────────────────────────────────────────────────────────

	getDepth(): number { return this.depthValue; }

	render(data: GraphData): void {
		if (data.nodes.length === 0) {
			this.clear('No connections found at this depth.');
			return;
		}

		this.destroyCy();
		this.containerEl.empty();

		const maxDist = data.nodes.reduce((m, n) => Math.max(m, n.distance), 0);

		this.cy = cytoscape({
			container: this.containerEl,
			elements:  this.buildElements(data),
			// Cytoscape's TS types don't cover data() / mapData() expressions,
			// so the style array is cast through unknown.
			style: this.buildStyle() as unknown as cytoscape.StylesheetJson,
			layout: this.buildLayout(maxDist),
			userZoomingEnabled:   true,
			userPanningEnabled:   true,
			boxSelectionEnabled:  false,
			autoungrabify:        false,
		});

		this.cy.on('tap', 'node', (evt) => {
			this.onNavigate(evt.target.id() as string);
		});

		// Fit after the layout settles.
		this.cy.one('layoutstop', () => { this.cy?.fit(undefined, 20); });
	}

	clear(message = 'Open a note to see its connections.'): void {
		this.destroyCy();
		this.containerEl.empty();
		this.showEmpty(message);
	}

	// ── Build helpers ────────────────────────────────────────────────────────

	private buildControls(): void {
		const controls = this.el.createDiv({ cls: 'fn-controls' });
		controls.createSpan({ text: 'Depth:', cls: 'fn-ctrl-label' });

		const slider = controls.createEl('input', { cls: 'fn-depth-slider' });
		slider.type  = 'range';
		slider.min   = '1';
		slider.max   = '5';
		slider.value = String(this.depthValue);

		this.depthDisplay = controls.createSpan({
			text: String(this.depthValue),
			cls:  'fn-depth-value',
		});

		slider.addEventListener('input', () => {
			const val = parseInt(slider.value, 10);
			if (isNaN(val)) return;
			this.depthValue = val;
			this.depthDisplay.setText(String(val));
			this.onDepthChange(val);
		});

		// Legend
		const legend = controls.createDiv({ cls: 'fn-legend' });
		this.legendDot(legend, 'upstream',   'Upstream');
		this.legendDot(legend, 'active',     'Active');
		this.legendDot(legend, 'downstream', 'Downstream');
	}

	private legendDot(parent: HTMLElement, type: string, label: string): void {
		const item = parent.createDiv({ cls: 'fn-legend-item' });
		const dot  = item.createDiv({ cls: 'fn-legend-dot' });
		dot.style.backgroundColor = NODE_COLORS[type] ?? '#888';
		item.createSpan({ text: label, cls: 'fn-legend-label' });
	}

	private buildElements(data: GraphData): cytoscape.ElementDefinition[] {
		const nodeEls = data.nodes.map(n => ({
			group: 'nodes' as const,
			data: {
				id:      n.id,
				label:   n.label,
				type:    n.type,
				color:   NODE_COLORS[n.type] ?? '#888',
				opacity: this.computeOpacity(n),
				size:    this.computeSize(n),
			},
		}));

		const edgeEls = data.edges.map(e => ({
			group: 'edges' as const,
			data: { id: e.id, source: e.source, target: e.target },
		}));

		return [...nodeEls, ...edgeEls];
	}

	private buildStyle(): object[] {
		return [
			{
				selector: 'node',
				style: {
					'label':            'data(label)',
					'text-wrap':        'wrap',
					'text-max-width':   '78px',
					'font-size':        '9px',
					'color':            '#ffffff',
					'text-outline-color':  '#333333',
					'text-outline-width':  1,
					'text-valign':      'center',
					'text-halign':      'center',
					'background-color': 'data(color)',
					'width':            'data(size)',
					'height':           'data(size)',
					'opacity':          'data(opacity)',
				},
			},
			{
				selector: 'node[type = "active"]',
				style: {
					'font-size':           '10px',
					'font-weight':         'bold',
					'text-outline-color':  '#7a5000',
					'text-outline-width':  1.5,
				},
			},
			{
				selector: 'node:selected',
				style: {
					'border-width':   2.5,
					'border-color':   '#ffffff',
					'border-opacity': 0.9,
				},
			},
			{
				selector: 'edge',
				style: {
					'curve-style':        'bezier',
					'target-arrow-shape': 'triangle',
					'arrow-scale':        0.7,
					'width':              1.5,
					'line-color':         '#888888',
					'target-arrow-color': '#888888',
					'opacity':            0.55,
				},
			},
		];
	}

	private buildLayout(maxDist: number): cytoscape.LayoutOptions {
		return {
			name:     'concentric',
			// Higher weight → closer to center.  Active node gets maximum weight.
			concentric: (node: cytoscape.NodeSingular) => {
				const dist = node.data('distance') as number;
				return maxDist + 1 - dist;
			},
			levelWidth:    () => 1,
			padding:       24,
			animate:       false,
			minNodeSpacing: 12,
			startAngle:    -Math.PI / 2,
			sweep:         2 * Math.PI,
			clockwise:     true,
			equidistant:   false,
		} as cytoscape.LayoutOptions;
	}

	// ── Visual mapping ────────────────────────────────────────────────────────

	private computeOpacity(node: GraphNode): number {
		if (node.type === 'active') return 1.0;
		const ratio = (node.distance - 1) / Math.max(this.depthValue - 1, 1);
		return NODE_OPACITY_MAX - ratio * (NODE_OPACITY_MAX - NODE_OPACITY_MIN);
	}

	private computeSize(node: GraphNode): number {
		if (node.type === 'active') return NODE_SIZE_ACTIVE;
		const ratio = (node.distance - 1) / Math.max(this.depthValue - 1, 1);
		return Math.round(NODE_SIZE_MAX - ratio * (NODE_SIZE_MAX - NODE_SIZE_MIN));
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	private destroyCy(): void {
		if (this.cy) { this.cy.destroy(); this.cy = null; }
	}

	private showEmpty(msg: string): void {
		this.containerEl.empty();
		this.containerEl.createDiv({ cls: 'fn-empty', text: msg });
	}
}
