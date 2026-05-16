import { TFile } from 'obsidian';
import { NoteScore, SortMode } from './link-counter';

export interface FilterState {
	mode: SortMode;
	folderPrefix: string;
	limit: number;
}

type RefreshCallback  = (filter: FilterState) => void;
type NavigateCallback = (file: TFile) => void;

const LIMIT_OPTIONS = [10, 15, 20, 25];

export class ConnectivityView {
	readonly el: HTMLElement;

	private mode: SortMode = 'inbound';
	private folderPrefix = '';
	private limit = 25;

	private inBtn!:  HTMLElement;
	private outBtn!: HTMLElement;
	private listEl!: HTMLElement;

	constructor(
		private onRefresh:  RefreshCallback,
		private onNavigate: NavigateCallback,
	) {
		this.el = document.createElement('div');
		this.el.addClass('con-view');
		this.buildUI();
	}

	// ── Public API ───────────────────────────────────────────────────────────

	getCurrentFilter(): FilterState {
		return { mode: this.mode, folderPrefix: this.folderPrefix, limit: this.limit };
	}

	render(scores: NoteScore[]): void {
		this.listEl.empty();

		if (scores.length === 0) {
			this.listEl.createDiv({ cls: 'con-empty', text: 'No notes match the current filter.' });
			return;
		}

		const label = this.mode === 'inbound' ? 'inbound' : 'outbound';

		scores.forEach((score, i) => {
			const count = this.mode === 'inbound' ? score.inbound : score.outbound;
			const item  = this.listEl.createDiv({ cls: 'con-item' });

			item.createSpan({ text: `#${i + 1}`, cls: 'con-rank' });

			const link = item.createEl('a', { text: score.file.basename, cls: 'con-name' });
			link.title = score.file.path;
			link.addEventListener('click', () => this.onNavigate(score.file));

			item.createSpan({ text: `${count} ${label}`, cls: 'con-count' });
		});
	}

	// ── UI builder ───────────────────────────────────────────────────────────

	private buildUI(): void {
		// Row 1 — mode toggle + limit selector
		const toolbar = this.el.createDiv({ cls: 'con-toolbar' });
		this.buildModeGroup(toolbar);

		const limitSel = toolbar.createEl('select', { cls: 'con-limit-select' });
		for (const n of LIMIT_OPTIONS) {
			const opt = limitSel.createEl('option', { value: String(n) });
			opt.text = `Top ${n}`;
			if (n === this.limit) opt.selected = true;
		}
		limitSel.addEventListener('change', () => {
			const parsed = parseInt(limitSel.value, 10);
			this.limit = isNaN(parsed) ? 25 : parsed;
			this.onRefresh(this.getCurrentFilter());
		});

		// Row 2 — folder filter
		const filterRow = this.el.createDiv({ cls: 'con-filter-row' });
		filterRow.createSpan({ text: 'Folder:', cls: 'con-filter-label' });
		const input = filterRow.createEl('input', { cls: 'con-filter-input' });
		input.type = 'text';
		input.placeholder = 'e.g. Electrical/';
		input.addEventListener('input', () => {
			this.folderPrefix = input.value;
			this.onRefresh(this.getCurrentFilter());
		});

		// List area
		this.listEl = this.el.createDiv({ cls: 'con-list' });
		this.listEl.createDiv({ cls: 'con-empty', text: 'Computing scores…' });
	}

	private buildModeGroup(parent: HTMLElement): void {
		const group = parent.createDiv({ cls: 'con-mode-group' });

		this.inBtn  = group.createEl('button', { text: 'Inbound',  cls: 'con-mode-btn con-mode-active' });
		this.outBtn = group.createEl('button', { text: 'Outbound', cls: 'con-mode-btn' });

		this.inBtn.addEventListener('click', () => this.setMode('inbound'));
		this.outBtn.addEventListener('click', () => this.setMode('outbound'));
	}

	private setMode(mode: SortMode): void {
		this.mode = mode;
		this.inBtn.toggleClass('con-mode-active',  mode === 'inbound');
		this.outBtn.toggleClass('con-mode-active', mode === 'outbound');
		this.onRefresh(this.getCurrentFilter());
	}
}
