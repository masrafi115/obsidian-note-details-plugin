import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings } from './settings/settings';
import { NoteDetailsSettingTab } from './settings/settings-tab';
import { EventBus } from './core/event-bus';
import { ModuleRegistry } from './core/module-registry';
import { createDefaultLayout } from './core/layout-store';
import { ControlPanelView, CONTROL_PANEL_VIEW_TYPE } from './framework/control-panel.view';
import { NoteAnatomyModule } from './modules/note-anatomy/note-anatomy.module';

export default class NoteDetailsPlugin extends Plugin {
	settings: PluginSettings;
	readonly eventBus = new EventBus();
	readonly registry = new ModuleRegistry();

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(
			CONTROL_PANEL_VIEW_TYPE,
			(leaf: WorkspaceLeaf) =>
				new ControlPanelView(leaf, this, this.registry, this.eventBus),
		);

		this.addRibbonIcon('layout-dashboard', 'Note Details', () => {
			void this.activateControlPanel();
		});

		this.addCommand({
			id: 'open-control-panel',
			name: 'Open Control Panel',
			callback: () => void this.activateControlPanel(),
		});

		this.addSettingTab(new NoteDetailsSettingTab(this.app, this));

		this.registry.register(new NoteAnatomyModule());
		this.registry.loadAll(this.app, this.eventBus);
	}

	onunload(): void {
		this.registry.unloadAll();
		this.eventBus.clear();
	}

	async activateControlPanel(): Promise<void> {
		const { workspace } = this.app;
		const existing = workspace.getLeavesOfType(CONTROL_PANEL_VIEW_TYPE);
		const existingLeaf = existing[0];
		if (existingLeaf) {
			workspace.revealLeaf(existingLeaf);
			return;
		}
		const leaf = workspace.getRightLeaf(false);
		if (!leaf) return;
		await leaf.setViewState({ type: CONTROL_PANEL_VIEW_TYPE, active: true });
		workspace.revealLeaf(leaf);
	}

	async loadSettings(): Promise<void> {
		const saved = (await this.loadData()) as Partial<PluginSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, saved ?? {}) as PluginSettings;
		// Guard: if persisted data has a corrupted layout, reset to default
		if (!this.settings.layout?.presets?.length) {
			this.settings.layout = createDefaultLayout();
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
