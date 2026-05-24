// js/ui/regionList.js — list of regions in the sidebar
import { $, createEl } from '../core/dom.js';
import { state, deleteRegion, selectRegion, clearRegions } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';

export function initRegionList() {
  const clearBtn = $('#btn-clear');
  if (clearBtn) clearBtn.addEventListener('click', () => clearRegions());

  on(EVENTS.REGIONS_CHANGED, renderList);
  on(EVENTS.REGION_SELECTED, renderList);

  renderList();
}

function renderList() {
  const wrap = $('#region-list');
  const countChip = $('#region-count');
  const stRg = $('#st-rg');
  if (countChip) countChip.textContent = state.regions.length;
  if (stRg) stRg.textContent = state.regions.length;
  if (!wrap) return;

  wrap.innerHTML = '';
  if (state.regions.length === 0) {
    wrap.append(createEl('div', { class: 'empty-state' }, 'まだ領域はありません'));
    return;
  }

  state.regions.forEach((r, i) => {
    const el = createEl('div', {
      class: 'region-item' + (state.selectedId === r.id ? ' active' : ''),
    });
    el.append(
      createEl('span', { class: 'idx' }, `#${String(i + 1).padStart(2, '0')}`),
      createEl('span', { class: 'meta' }, `${Math.round(r.w)}×${Math.round(r.h)}`),
      createEl('span', { class: 'type' }, r.type),
      createEl('span', { class: 'x', title: '削除' }, '✕'),
    );
    el.addEventListener('click', e => {
      if (e.target.classList.contains('x')) {
        deleteRegion(r.id);
      } else {
        selectRegion(r.id);
      }
    });
    wrap.append(el);
  });
}
