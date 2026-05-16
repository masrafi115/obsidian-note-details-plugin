import { IPluginLayout, IPreset } from '../interfaces/i-layout';
import { addPreset, removePreset, getActivePreset } from '../core/layout-store';

type PresetChangeCallback = (preset: IPreset) => void;

export class PresetManager {
	private changeCallbacks: PresetChangeCallback[] = [];

	constructor(
		private layout: IPluginLayout,
		private saveLayout: () => Promise<void>,
	) {}

	onPresetChange(cb: PresetChangeCallback): void {
		this.changeCallbacks.push(cb);
	}

	getActivePreset(): IPreset | undefined {
		return getActivePreset(this.layout);
	}

	getPresets(): IPreset[] {
		return this.layout.presets;
	}

	async switchPreset(id: string): Promise<void> {
		this.layout.activePresetId = id;
		await this.saveLayout();
		const preset = this.getActivePreset();
		if (preset) this.notify(preset);
	}

	async createPreset(name: string): Promise<IPreset> {
		const preset = addPreset(this.layout, name);
		this.layout.activePresetId = preset.id;
		await this.saveLayout();
		this.notify(preset);
		return preset;
	}

	async deletePreset(id: string): Promise<void> {
		if (this.layout.presets.length <= 1) return;
		removePreset(this.layout, id);
		await this.saveLayout();
		const preset = this.getActivePreset();
		if (preset) this.notify(preset);
	}

	async renamePreset(id: string, name: string): Promise<void> {
		const preset = this.layout.presets.find(p => p.id === id);
		if (preset) {
			preset.name = name;
			await this.saveLayout();
		}
	}

	private notify(preset: IPreset): void {
		this.changeCallbacks.forEach(cb => cb(preset));
	}
}
