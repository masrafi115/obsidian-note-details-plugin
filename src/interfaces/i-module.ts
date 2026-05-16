import { App, TFile } from 'obsidian';
import { EventBus } from '../core/event-bus';
import { PluginSettings } from '../settings/settings';

export interface IModule {
	readonly id: string;
	readonly displayName: string;
	onload(app: App, eventBus: EventBus): void;
	onunload(): void;
	getView(): HTMLElement;
	onActiveFileChange(file: TFile | null): void;
	onSettingsChange(settings: PluginSettings): void;
}
