import { IModule } from '../interfaces/i-module';
import { ISlot, HeightMode } from '../interfaces/i-layout';

const HEIGHT_MIN: Record<HeightMode, string> = {
	compact: '120px',
	medium:  '280px',
	large:   '480px',
	full:    '600px',
};

export class WidgetHost {
	readonly el: HTMLElement;
	readonly slot: ISlot;

	constructor(
		slot: ISlot,
		private module: IModule | null,
		private onSlotChange: () => Promise<void>,
	) {
		this.slot = slot;
		this.el = this.build();
	}

	private build(): HTMLElement {
		const host = document.createElement('div');
		host.addClass('ndp-widget-host');
		host.dataset.moduleId = this.slot.moduleId;
		this.applyMinHeight(host);

		const header = host.createDiv({ cls: 'ndp-widget-header' });
		header.createSpan({
			text: this.module?.displayName ?? this.slot.moduleId,
			cls: 'ndp-widget-title',
		});

		const controls = header.createDiv({ cls: 'ndp-widget-controls' });

		// Height mode selector
		const heightSel = controls.createEl('select', { cls: 'ndp-height-select' });
		(['compact', 'medium', 'large', 'full'] as HeightMode[]).forEach(h => {
			const opt = heightSel.createEl('option', { value: h });
			opt.text = h;
			if (h === this.slot.heightMode) opt.selected = true;
		});
		heightSel.addEventListener('change', () => {
			this.slot.heightMode = heightSel.value as HeightMode;
			this.applyMinHeight(host);
			void this.onSlotChange();
		});

		// Collapse toggle
		let collapsed = false;
		const collapseBtn = controls.createEl('button', { cls: 'ndp-collapse-btn', text: '−' });
		collapseBtn.addEventListener('click', () => {
			collapsed = !collapsed;
			collapseBtn.setText(collapsed ? '+' : '−');
			contentEl.style.display = collapsed ? 'none' : '';
		});

		const contentEl = host.createDiv({ cls: 'ndp-widget-content' });
		if (this.module) {
			contentEl.appendChild(this.module.getView());
		} else {
			contentEl.createDiv({
				cls: 'ndp-placeholder',
				text: `"${this.slot.moduleId}" — module not yet implemented.`,
			});
		}

		return host;
	}

	private applyMinHeight(el: HTMLElement): void {
		el.style.minHeight = HEIGHT_MIN[this.slot.heightMode] ?? '280px';
	}
}
