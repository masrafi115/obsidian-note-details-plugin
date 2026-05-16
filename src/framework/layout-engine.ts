import { WidgetHost } from './widget-host';

export class LayoutEngine {
	constructor(private containerEl: HTMLElement) {}

	render(hosts: WidgetHost[]): void {
		this.containerEl.empty();
		const sorted = [...hosts].sort((a, b) => a.slot.order - b.slot.order);
		for (const host of sorted) {
			if (host.slot.visible) {
				this.containerEl.appendChild(host.el);
			}
		}
	}
}
