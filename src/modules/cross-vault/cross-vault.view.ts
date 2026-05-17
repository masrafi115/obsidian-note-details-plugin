import { CrossVaultDep } from './vault-scanner';

type ScanCallback     = () => void;
type NavigateCallback = (path: string) => void;
type ExportCallback   = () => void;

export class CrossVaultView {
	readonly el: HTMLElement;

	private statusEl!:    HTMLElement;
	private tableBodyEl!: HTMLElement;

	constructor(
		private onScan:     ScanCallback,
		private onNavigate: NavigateCallback,
		private onExport:   ExportCallback,
	) {
		this.el = document.createElement('div');
		this.el.addClass('cv-view');
		this.buildUI();
	}

	// ── Public API ───────────────────────────────────────────────────────────

	setLoading(): void {
		this.tableBodyEl.empty();
		this.statusEl.setText('Scanning vault…');
	}

	render(deps: CrossVaultDep[]): void {
		this.tableBodyEl.empty();

		if (deps.length === 0) {
			this.statusEl.setText('No cross-vault references found.');
			this.tableBodyEl.createDiv({ cls: 'cv-empty', text: 'No cross-vault references found.' });
			return;
		}

		this.statusEl.setText(`${deps.length} reference${deps.length === 1 ? '' : 's'} found.`);

		for (const dep of deps) {
			const row = this.tableBodyEl.createDiv({ cls: 'cv-row' });

			const srcLink = row.createEl('a', { text: dep.sourceBasename, cls: 'cv-cell cv-source' });
			srcLink.title = dep.sourcePath;
			srcLink.addEventListener('click', () => this.onNavigate(dep.sourcePath));

			row.createSpan({ text: dep.targetVault || '—', cls: 'cv-cell cv-vault' });
			row.createSpan({ text: dep.targetFile  || '—', cls: 'cv-cell cv-file'  });
		}
	}

	// ── Build helpers ────────────────────────────────────────────────────────

	private buildUI(): void {
		// Toolbar: scan + export buttons, status text
		const toolbar = this.el.createDiv({ cls: 'cv-toolbar' });

		const scanBtn = toolbar.createEl('button', { text: 'Scan', cls: 'cv-btn' });
		scanBtn.addEventListener('click', () => this.onScan());

		const exportBtn = toolbar.createEl('button', { text: 'Export CSV', cls: 'cv-btn' });
		exportBtn.addEventListener('click', () => this.onExport());

		this.statusEl = toolbar.createSpan({ text: 'Scanning vault…', cls: 'cv-status' });

		// Column header (outside the scroll area)
		const header = this.el.createDiv({ cls: 'cv-row cv-header' });
		header.createSpan({ text: 'Source File',  cls: 'cv-cell cv-source' });
		header.createSpan({ text: 'Target Vault', cls: 'cv-cell cv-vault'  });
		header.createSpan({ text: 'Target File',  cls: 'cv-cell cv-file'   });

		// Scrollable body
		this.tableBodyEl = this.el.createDiv({ cls: 'cv-table-body' });
	}
}
