import { TFile } from 'obsidian';
import { IPreset } from '../interfaces/i-layout';

export type BusEventMap = {
	'active-file-changed':   { file: TFile | null };
	'layout-preset-changed': { preset: IPreset };
	'module-visibility':     { moduleId: string; visible: boolean };
	'vault-scan-complete':   { deps: unknown[] };
	'metadata-changed':      { file: TFile };
};

type BusEventKey = keyof BusEventMap;
type Listener<K extends BusEventKey> = (payload: BusEventMap[K]) => void;

export class EventBus {
	private listeners = new Map<BusEventKey, Set<Listener<BusEventKey>>>();

	on<K extends BusEventKey>(event: K, listener: Listener<K>): void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)!.add(listener as Listener<BusEventKey>);
	}

	off<K extends BusEventKey>(event: K, listener: Listener<K>): void {
		this.listeners.get(event)?.delete(listener as Listener<BusEventKey>);
	}

	emit<K extends BusEventKey>(event: K, payload: BusEventMap[K]): void {
		this.listeners.get(event)?.forEach(l => l(payload));
	}

	clear(): void {
		this.listeners.clear();
	}
}
