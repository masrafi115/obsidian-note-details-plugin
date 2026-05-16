export type HeightMode = 'compact' | 'medium' | 'large' | 'full';

export interface ISlot {
	moduleId: string;
	visible: boolean;
	heightMode: HeightMode;
	order: number;
}

export interface IPreset {
	id: string;
	name: string;
	slots: ISlot[];
}

export interface IPluginLayout {
	activePresetId: string;
	presets: IPreset[];
}
