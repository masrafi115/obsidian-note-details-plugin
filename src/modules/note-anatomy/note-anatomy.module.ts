import { App, MarkdownView, TFile } from 'obsidian';
import { IModule } from '../../interfaces/i-module';
import { EventBus } from '../../core/event-bus';
import { PluginSettings } from '../../settings/settings';
import { NoteAnatomyView } from './note-anatomy.view';
import {
	parseHeadings,
	parseExternalUrls,
	parseCrossVaultRefs,
} from './markdown-parser';

export class NoteAnatomyModule implements IModule {
	readonly id = 'note-anatomy';
	readonly displayName = 'Note Anatomy';

	private app!: App;
	private view!: NoteAnatomyView;

	onload(app: App, eventBus: EventBus): void {
		this.app = app;
		this.view = new NoteAnatomyView((line) => this.navigateToLine(line));

		eventBus.on('active-file-changed', ({ file }) => {
			void this.loadFile(file);
		});

		// Populate immediately with whatever is already open.
		void this.loadFile(app.workspace.getActiveFile());
	}

	onunload(): void {
		// EventBus listeners are cleared by the plugin; nothing else to tear down.
	}

	getView(): HTMLElement {
		return this.view.el;
	}

	onActiveFileChange(file: TFile | null): void {
		void this.loadFile(file);
	}

	onSettingsChange(_settings: PluginSettings): void {
		// No settings-driven behavior in this module.
	}

	// ── Private ──────────────────────────────────────────────────────────────

	private async loadFile(file: TFile | null): Promise<void> {
		if (!file || file.extension !== 'md') {
			this.view.clear();
			return;
		}

		const content = await this.app.vault.read(file);
		const cache = this.app.metadataCache.getFileCache(file);
		const rawFm = cache?.frontmatter ?? null;

		// Filter Obsidian's internal `position` key from the frontmatter object.
		let frontmatter: Record<string, unknown> | null = null;
		if (rawFm) {
			frontmatter = {};
			for (const key of Object.keys(rawFm)) {
				if (key !== 'position') {
					frontmatter[key] = rawFm[key];
				}
			}
		}

		this.view.render({
			headings:       parseHeadings(content),
			urls:           parseExternalUrls(content),
			crossVaultRefs: parseCrossVaultRefs(content),
			frontmatter,
			fileName: file.name,
			filePath: file.path,
		});
	}

	private navigateToLine(line: number): void {
		const mdView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!mdView) return;
		const editor = mdView.editor;
		const pos = { line, ch: 0 };
		editor.setCursor(pos);
		editor.scrollIntoView({ from: pos, to: pos }, true);
		editor.focus();
	}
}
