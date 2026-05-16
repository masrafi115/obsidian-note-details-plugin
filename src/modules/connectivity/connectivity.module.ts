import { App, EventRef, TFile } from 'obsidian';
import { IModule } from '../../interfaces/i-module';
import { EventBus } from '../../core/event-bus';
import { PluginSettings } from '../../settings/settings';
import { ConnectivityView } from './connectivity.view';
import { computeScores, filterAndSort } from './link-counter';

const DEBOUNCE_MS = 400;

export class ConnectivityModule implements IModule {
	readonly id = 'connectivity';
	readonly displayName = 'Connectivity Leaderboard';

	private app!: App;
	private view!: ConnectivityView;
	private metadataRef: EventRef | null = null;
	private debounceTimer: number | null = null;

	onload(app: App, _eventBus: EventBus): void {
		this.app = app;

		this.view = new ConnectivityView(
			(filter) => this.refresh(),
			(file)   => void app.workspace.getLeaf(false).openFile(file),
		);

		// Auto-update whenever any file's metadata changes.
		this.metadataRef = app.metadataCache.on('changed', () => this.scheduleRefresh());

		this.refresh();
	}

	onunload(): void {
		if (this.metadataRef !== null) {
			this.app.metadataCache.offref(this.metadataRef);
			this.metadataRef = null;
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
		// Leaderboard is vault-wide; active file does not affect it.
	}

	onSettingsChange(_settings: PluginSettings): void {
		// No settings-driven behavior in this module.
	}

	// ── Private ──────────────────────────────────────────────────────────────

	private scheduleRefresh(): void {
		if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
		this.debounceTimer = window.setTimeout(() => {
			this.refresh();
			this.debounceTimer = null;
		}, DEBOUNCE_MS);
	}

	private refresh(): void {
		const filter = this.view.getCurrentFilter();
		const all    = computeScores(this.app);
		const ranked = filterAndSort(all, filter.mode, filter.folderPrefix, filter.limit);
		this.view.render(ranked);
	}
}
