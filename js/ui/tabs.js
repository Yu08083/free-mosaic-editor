// js/ui/tabs.js — sidebar tab switching
import { $$ } from '../core/dom.js';

export function initTabs() {
  const tabs  = $$('.tab');
  const panes = $$('.pane');
  for (const tab of tabs) {
    tab.addEventListener('click', () => activate(tab.dataset.tab, tabs, panes));
  }
}

function activate(name, tabs, panes) {
  for (const t of tabs) t.classList.toggle('active', t.dataset.tab === name);
  for (const p of panes) p.classList.toggle('active', p.dataset.pane === name);
}

export function showTab(name) {
  activate(name, $$('.tab'), $$('.pane'));
}
