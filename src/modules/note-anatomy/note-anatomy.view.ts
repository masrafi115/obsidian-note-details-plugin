import { ParsedHeading, ParsedCrossVaultRef } from './markdown-parser';

export interface NoteAnatomyData {
	headings: ParsedHeading[];
	urls: string[];
	crossVaultRefs: ParsedCrossVaultRef[];
	frontmatter: Record<string, unknown> | null;
	fileName: string;
	filePath: string;
}

type NavigateToLineCallback = (line: number) => void;

type TabId = 'headings' | 'urls' | 'cross-vault' | 'frontmatter';

const TAB_LABELS: { id: TabId; label: string }[] = [
	{ id: 'headings',    label: 'Headings' },
	{ id: 'urls',        label: 'External URLs' },
	{ id: 'cross-vault', label: 'Cross-Vault' },
	{ id: 'frontmatter', label: 'Frontmatter' },
];

export class NoteAnatomyView {
	readonly el: HTMLElement;

	private tabBtns  = new Map<TabId, HTMLElement>();
	private panels   = new Map<TabId, HTMLElement>();
	private activeTab: TabId = 'headings';
	private onNavigate: NavigateToLineCallback;

	constructor(onNavigateToLine: NavigateToLineCallback) {
		this.onNavigate = onNavigateToLine;
		this.el = document.createElement('div');
		this.el.addClass('nan-view');
		this.buildSkeleton();
	}

	// ── Public API ───────────────────────────────────────────────────────────

	render(data: NoteAnatomyData): void {
		this.renderHeadings(data.headings);
		this.renderUrls(data.urls);
		this.renderCrossVault(data.crossVaultRefs);
		this.renderFrontmatter(data.frontmatter, data.filePath);
	}

	clear(): void {
		const msg = 'Open a note to inspect its structure.';
		this.panels.forEach(panel => {
			panel.empty();
			this.emptyState(panel, msg);
		});
	}

	// ── Layout ───────────────────────────────────────────────────────────────

	private buildSkeleton(): void {
		const tabBar = this.el.createDiv({ cls: 'nan-tab-bar' });

		for (const { id, label } of TAB_LABELS) {
			const btn = tabBar.createEl('button', { text: label, cls: 'nan-tab-btn' });
			if (id === this.activeTab) btn.addClass('nan-tab-active');
			btn.addEventListener('click', () => this.switchTab(id));
			this.tabBtns.set(id, btn);

			const panel = this.el.createDiv({ cls: 'nan-tab-panel' });
			panel.style.display = id === this.activeTab ? '' : 'none';
			this.emptyState(panel, 'Open a note to inspect its structure.');
			this.panels.set(id, panel);
		}
	}

	private switchTab(id: TabId): void {
		this.activeTab = id;
		this.tabBtns.forEach((btn, tabId) => btn.toggleClass('nan-tab-active', tabId === id));
		this.panels.forEach((panel, tabId) => { panel.style.display = tabId === id ? '' : 'none'; });
	}

	// ── Tab renderers ────────────────────────────────────────────────────────

	private renderHeadings(headings: ParsedHeading[]): void {
		const panel = this.panels.get('headings');
		if (!panel) return;
		panel.empty();

		if (headings.length === 0) {
			this.emptyState(panel, 'No H1–H3 headings found.');
			return;
		}

		for (const h of headings) {
			const item = panel.createDiv({ cls: `nan-heading-item nan-h${h.level}` });
			const link = item.createEl('a', { text: h.text, cls: 'nan-heading-link' });
			const lineNum = h.line;
			link.addEventListener('click', (e) => {
				e.preventDefault();
				this.onNavigate(lineNum);
			});
		}
	}

	private renderUrls(urls: string[]): void {
		const panel = this.panels.get('urls');
		if (!panel) return;
		panel.empty();

		if (urls.length === 0) {
			this.emptyState(panel, 'No external URLs found.');
			return;
		}

		for (const url of urls) {
			const item = panel.createDiv({ cls: 'nan-url-item' });
			const link = item.createEl('a', { cls: 'nan-url-link external-link' });
			link.href = url;
			link.textContent = url;
			link.setAttribute('target', '_blank');
			link.setAttribute('rel', 'noopener noreferrer');
		}
	}

	private renderCrossVault(refs: ParsedCrossVaultRef[]): void {
		const panel = this.panels.get('cross-vault');
		if (!panel) return;
		panel.empty();

		if (refs.length === 0) {
			this.emptyState(panel, 'No cross-vault references found.');
			return;
		}

		for (const ref of refs) {
			const item = panel.createDiv({ cls: 'nan-cv-item' });
			item.createDiv({ cls: 'nan-cv-vault', text: `Vault: ${ref.vault}` });
			item.createDiv({ cls: 'nan-cv-file',  text: `File:  ${ref.file}` });
			const link = item.createEl('a', { text: 'Open in Obsidian →', cls: 'nan-cv-link' });
			link.href = ref.raw;
			link.setAttribute('target', '_blank');
		}
	}

	private renderFrontmatter(fm: Record<string, unknown> | null, filePath: string): void {
		const panel = this.panels.get('frontmatter');
		if (!panel) return;
		panel.empty();

		panel.createDiv({ cls: 'nan-fm-path', text: filePath });

		if (!fm) {
			this.emptyState(panel, 'No frontmatter found.');
			return;
		}

		const keys = Object.keys(fm).filter(k => k !== 'position');
		if (keys.length === 0) {
			this.emptyState(panel, 'Frontmatter block is empty.');
			return;
		}

		const table = panel.createEl('table', { cls: 'nan-fm-table' });
		for (const key of keys) {
			const value = fm[key];
			const valueStr = value === null || value === undefined
				? ''
				: typeof value === 'object'
					? JSON.stringify(value)
					: String(value);

			const row = table.createEl('tr');
			row.createEl('td', { text: key,      cls: 'nan-fm-key' });
			row.createEl('td', { text: valueStr, cls: 'nan-fm-value' });
		}
	}

	// ── Utility ──────────────────────────────────────────────────────────────

	private emptyState(parent: HTMLElement, message: string): void {
		parent.createDiv({ cls: 'nan-empty', text: message });
	}
}
