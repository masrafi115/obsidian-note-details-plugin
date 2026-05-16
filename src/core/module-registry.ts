import { App } from 'obsidian';
import { IModule } from '../interfaces/i-module';
import { EventBus } from './event-bus';

export class ModuleRegistry {
	private modules = new Map<string, IModule>();

	register(module: IModule): void {
		this.modules.set(module.id, module);
	}

	get(id: string): IModule | undefined {
		return this.modules.get(id);
	}

	getAll(): IModule[] {
		return Array.from(this.modules.values());
	}

	loadAll(app: App, eventBus: EventBus): void {
		this.modules.forEach(m => m.onload(app, eventBus));
	}

	unloadAll(): void {
		this.modules.forEach(m => m.onunload());
	}
}
