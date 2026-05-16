import { App, TFile } from 'obsidian';
import { IModule } from '../../interfaces/i-module';
import { EventBus } from '../../core/event-bus';
import { PluginSettings } from '../../settings/settings';
import { FocalNodeView } from './focal-node.view';
import { buildGraph } from './graph-builder';

export class FocalNodeModule implements IModule {
	readonly id = 'focal-node';
	readonly displayName = 'Focal Node Graph';

	private app!: App;
	private view!: FocalNodeView;
	private currentFile: TFile | null = null;

	onload(app: App, eventBus: EventBus): void {
		this.app = app;

		this.view = new FocalNodeView(
			// Depth changed — re-render with same file but new depth.
			() => this.loadFile(this.currentFile),
			// Node clicked — open that note.
			(fileId) => {
				const leaf = app.workspace.getLeaf(false);
				const file = app.vault.getAbstractFileByPath(fileId);
				if (leaf && file instanceof TFile) void leaf.openFile(file);
			},
		);

		// The view renders in response to EventBus events so Cytoscape always
		// initialises with the container already attached to the DOM.
		eventBus.on('active-file-changed', ({ file }) => this.loadFile(file));
	}

	onunload(): void {
		this.view?.clear();
	}

	getView(): HTMLElement {
		return this.view.el;
	}

	onActiveFileChange(file: TFile | null): void {
		this.loadFile(file);
	}

	onSettingsChange(_settings: PluginSettings): void {
		// No settings-driven behaviour in this module.
	}

	// ── Private ──────────────────────────────────────────────────────────────

	private loadFile(file: TFile | null): void {
		this.currentFile = file;

		if (!file || file.extension !== 'md') {
			this.view.clear();
			return;
		}

		const data = buildGraph(file, this.view.getDepth(), this.app);
		this.view.render(data);
	}
}
