import { ItemView, Notice, WorkspaceLeaf } from 'obsidian';
import { EventBus } from '../core/event-bus';
import { ModuleRegistry } from '../core/module-registry';
import { IPreset } from '../interfaces/i-layout';
import { LayoutEngine } from './layout-engine';
import { PresetManager } from './preset-manager';
import { WidgetHost } from './widget-host';
import NoteDetailsPlugin from '../main';

export const CONTROL_PANEL_VIEW_TYPE = 'note-details-control-panel';

export class ControlPanelView extends ItemView {
	private presetManager!: PresetManager;
	private layoutEngine!: LayoutEngine;
	private stackEl!: HTMLElement;
	private hosts: WidgetHost[] = [];

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: NoteDetailsPlugin,
		private registry: ModuleRegistry,
		private eventBus: EventBus,
	) {
		super(leaf);
	}

	getViewType(): string { return CONTROL_PANEL_VIEW_TYPE; }
	getDisplayText(): string { return 'Note Details'; }
	getIcon(): string { return 'layout-dashboard'; }

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('ndp-control-panel');

		this.presetManager = new PresetManager(
			this.plugin.settings.layout,
			() => this.plugin.saveSettings(),
		);

		// Build header first so the selector element exists, then wire up
		// the preset-change callback after stackEl is ready to avoid a
		// renderPreset call before the stack container exists.
		const headerEl = contentEl.createDiv({ cls: 'ndp-panel-header' });
		headerEl.createSpan({ text: 'Note Details', cls: 'ndp-panel-title' });
		const controlsEl = headerEl.createDiv({ cls: 'ndp-header-controls' });
		const sel = this.buildPresetSelector(controlsEl);

		this.stackEl = contentEl.createDiv({ cls: 'ndp-module-stack' });
		this.layoutEngine = new LayoutEngine(this.stackEl);

		// Register callback only after stackEl exists
		this.presetManager.onPresetChange(preset => {
			this.renderPreset(preset);
			this.refreshPresetOptions(sel);
		});

		this.buildHeaderButtons(controlsEl, sel);
		this.renderCurrentPreset();

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				const file = this.app.workspace.getActiveFile();
				this.eventBus.emit('active-file-changed', { file });
			})
		);

		// Notify modules of the file that is already open when the panel loads.
		this.eventBus.emit('active-file-changed', { file: this.app.workspace.getActiveFile() });
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	private buildPresetSelector(parent: HTMLElement): HTMLSelectElement {
		const sel = parent.createEl('select', { cls: 'ndp-preset-select' });
		this.refreshPresetOptions(sel);
		sel.addEventListener('change', () => void this.presetManager.switchPreset(sel.value));
		return sel;
	}

	private refreshPresetOptions(sel: HTMLSelectElement): void {
		sel.empty();
		const activeId = this.plugin.settings.layout.activePresetId;
		for (const preset of this.presetManager.getPresets()) {
			const opt = sel.createEl('option', { value: preset.id });
			opt.text = preset.name;
			opt.selected = preset.id === activeId;
		}
	}

	private buildHeaderButtons(parent: HTMLElement, sel: HTMLSelectElement): void {
		parent.createEl('button', { text: '+ New', cls: 'ndp-btn' })
			.addEventListener('click', () => void this.promptNewPreset(sel));

		parent.createEl('button', { text: 'Rename', cls: 'ndp-btn' })
			.addEventListener('click', () => void this.promptRenamePreset(sel));

		parent.createEl('button', { text: 'Delete', cls: 'ndp-btn ndp-btn-danger' })
			.addEventListener('click', () => void this.deleteCurrentPreset(sel));
	}

	private renderCurrentPreset(): void {
		const preset = this.presetManager.getActivePreset();
		if (preset) this.renderPreset(preset);
	}

	private renderPreset(preset: IPreset): void {
		this.hosts = preset.slots.map(slot => {
			const mod = this.registry.get(slot.moduleId) ?? null;
			return new WidgetHost(slot, mod, () => this.plugin.saveSettings());
		});

		if (this.hosts.length === 0) {
			this.stackEl.empty();
			this.stackEl.createDiv({
				cls: 'ndp-empty-state',
				text: 'No modules configured in this preset.',
			});
			return;
		}

		this.layoutEngine.render(this.hosts);
	}

	private async promptNewPreset(sel: HTMLSelectElement): Promise<void> {
		const name = window.prompt('New preset name:');
		if (!name?.trim()) return;
		await this.presetManager.createPreset(name.trim());
		this.refreshPresetOptions(sel);
	}

	private async promptRenamePreset(sel: HTMLSelectElement): Promise<void> {
		const active = this.presetManager.getActivePreset();
		if (!active) return;
		const name = window.prompt('Rename preset to:', active.name);
		if (!name?.trim() || name.trim() === active.name) return;
		await this.presetManager.renamePreset(active.id, name.trim());
		this.refreshPresetOptions(sel);
	}

	private async deleteCurrentPreset(sel: HTMLSelectElement): Promise<void> {
		const active = this.presetManager.getActivePreset();
		if (!active) return;
		if (this.presetManager.getPresets().length <= 1) {
			new Notice('Cannot delete the last preset.');
			return;
		}
		if (!window.confirm(`Delete preset "${active.name}"?`)) return;
		await this.presetManager.deletePreset(active.id);
		this.refreshPresetOptions(sel);
	}
}
