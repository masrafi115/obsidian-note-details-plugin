import { App, EventRef, TFile } from 'obsidian';
import { IModule } from '../../interfaces/i-module';
import { EventBus } from '../../core/event-bus';
import { PluginSettings } from '../../settings/settings';
import { CrossVaultView } from './cross-vault.view';
import { CrossVaultDep, scanVault } from './vault-scanner';
import { downloadCsv } from './csv-exporter';

const DEBOUNCE_MS = 400;

export class CrossVaultModule implements IModule {
	readonly id          = 'cross-vault';
	readonly displayName = 'Cross-Vault Dependencies';

	private app!:  App;
	private view!: CrossVaultView;

	private vaultRef:      EventRef | null = null;
	private debounceTimer: number   | null = null;
	private cachedDeps:    CrossVaultDep[] = [];

	onload(app: App, _eventBus: EventBus): void {
		this.app = app;

		this.view = new CrossVaultView(
			() => void this.runScan(),
			(path) => {
				const file = app.vault.getAbstractFileByPath(path);
				if (file instanceof TFile) void app.workspace.getLeaf(false).openFile(file);
			},
			() => downloadCsv(this.cachedDeps),
		);

		// Re-scan when any file in the vault is saved.
		this.vaultRef = app.vault.on('modify', () => this.scheduleScan());

		void this.runScan();
	}

	onunload(): void {
		if (this.vaultRef !== null) {
			this.app.vault.offref(this.vaultRef);
			this.vaultRef = null;
		}
		if (this.debounceTimer !== null) {
			window.clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
	}

	getView(): HTMLElement {
		return this.view.el;
	}

	onActiveFileChange(_file: TFile | null): void {
		// Vault-wide module; active file does not affect it.
	}

	onSettingsChange(_settings: PluginSettings): void {
		// No settings-driven behavior in this module.
	}

	// ── Private ──────────────────────────────────────────────────────────────

	private scheduleScan(): void {
		if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
		this.debounceTimer = window.setTimeout(() => {
			void this.runScan();
			this.debounceTimer = null;
		}, DEBOUNCE_MS);
	}

	private async runScan(): Promise<void> {
		this.view.setLoading();
		this.cachedDeps = await scanVault(this.app);
		this.view.render(this.cachedDeps);
	}
}
