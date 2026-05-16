import { IPluginLayout } from '../interfaces/i-layout';
import { createDefaultLayout } from '../core/layout-store';

export interface PluginSettings {
	layout: IPluginLayout;
	enabledModules: Record<string, boolean>;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	layout: createDefaultLayout(),
	enabledModules: {
		'focal-node':   false,
		'connectivity': false,
		'note-anatomy': false,
		'cross-vault':  false,
	},
};
