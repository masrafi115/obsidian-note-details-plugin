import { App, PluginSettingTab, Setting } from 'obsidian';
import NoteDetailsPlugin from '../main';

const MODULE_ENTRIES: { id: string; label: string }[] = [
	{ id: 'focal-node',   label: 'Focal Node Graph' },
	{ id: 'connectivity', label: 'Connectivity Leaderboard' },
	{ id: 'note-anatomy', label: 'Note Anatomy Scraper' },
	{ id: 'cross-vault',  label: 'Cross-Vault Dependency Bridge' },
];

export class NoteDetailsSettingTab extends PluginSettingTab {
	plugin: NoteDetailsPlugin;

	constructor(app: App, plugin: NoteDetailsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Note Details Plugin' });

		new Setting(containerEl)
			.setName('Open Control Panel')
			.setDesc('Open the Note Details Control Panel pane.')
			.addButton(btn =>
				btn.setButtonText('Open').onClick(() => {
					void this.plugin.activateControlPanel();
				})
			);

		containerEl.createEl('h3', { text: 'Modules' });
		containerEl.createEl('p', {
			text: 'Enable or disable individual modules. Disabled modules appear as placeholders in the panel.',
			cls: 'setting-item-description',
		});

		for (const entry of MODULE_ENTRIES) {
			new Setting(containerEl)
				.setName(entry.label)
				.addToggle(toggle =>
					toggle
						.setValue(this.plugin.settings.enabledModules[entry.id] ?? false)
						.onChange(async (value) => {
							this.plugin.settings.enabledModules[entry.id] = value;
							await this.plugin.saveSettings();
						})
				);
		}
	}
}
