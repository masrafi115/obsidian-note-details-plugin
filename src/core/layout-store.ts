import { IPluginLayout, IPreset, ISlot } from '../interfaces/i-layout';

const DEFAULT_PRESET_ID = 'default';

function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function createDefaultLayout(): IPluginLayout {
	const defaultPreset: IPreset = {
		id: DEFAULT_PRESET_ID,
		name: 'Default',
		slots: [
			{ moduleId: 'focal-node',   visible: true, heightMode: 'medium',  order: 0 },
			{ moduleId: 'connectivity', visible: true, heightMode: 'medium',  order: 1 },
			{ moduleId: 'note-anatomy', visible: true, heightMode: 'medium',  order: 2 },
			{ moduleId: 'cross-vault',  visible: true, heightMode: 'compact', order: 3 },
		],
	};
	return {
		activePresetId: DEFAULT_PRESET_ID,
		presets: [defaultPreset],
	};
}

export function getActivePreset(layout: IPluginLayout): IPreset | undefined {
	return layout.presets.find(p => p.id === layout.activePresetId);
}

export function addPreset(layout: IPluginLayout, name: string): IPreset {
	const preset: IPreset = { id: generateId(), name, slots: [] };
	layout.presets.push(preset);
	return preset;
}

export function removePreset(layout: IPluginLayout, id: string): void {
	layout.presets = layout.presets.filter(p => p.id !== id);
	if (layout.activePresetId === id) {
		layout.activePresetId = layout.presets[0]?.id ?? DEFAULT_PRESET_ID;
	}
}

export function upsertSlot(preset: IPreset, slot: ISlot): void {
	const idx = preset.slots.findIndex(s => s.moduleId === slot.moduleId);
	if (idx >= 0) {
		preset.slots[idx] = slot;
	} else {
		preset.slots.push(slot);
	}
}
