// js/metadata/render.js — render metadata into the right-side panel
import { $, createEl, escapeHtml } from '../core/dom.js';
import { state } from '../core/state.js';
import { SENSITIVE_FIELDS } from './tags.js';
import { buildMapsUrl } from './gps.js';

export function renderMetadata() {
  const md = state.metadata;
  const els = {
    file:   $('#m-file'),
    size:   $('#m-size'),
    type:   $('#m-type'),
    gps:    $('#m-gps'),
    date:   $('#m-date'),
    device: $('#m-device'),
    lens:   $('#m-lens'),
    soft:   $('#m-soft'),
  };

  if (!md) {
    setEmpty(els);
    setList(0, []);
    setCategories({});
    return;
  }

  const s = md.summary;
  setVal(els.file,   s.file,   false);
  setVal(els.size,   s.size,   false);
  setVal(els.type,   s.type,   false);
  setVal(els.gps,    s.gps,    !!s.gps, !!s.gps ? buildMapsUrl(s.gpsLat, s.gpsLon) : null);
  setVal(els.date,   s.date,   !!s.date);
  setVal(els.device, s.device, !!s.device);
  setVal(els.lens,   s.lens,   !!s.lens);
  setVal(els.soft,   s.soft,   !!s.soft);

  const keys = Object.keys(md.all).sort();
  setList(keys.length, keys.map(k => [k, md.all[k]]));

  const cats = categorize(md.all, md.summary);
  setCategories(cats);
}

function setVal(el, v, bad, link) {
  if (!el) return;
  el.innerHTML = '';
  if (!v) {
    el.textContent = '—';
    el.classList.add('empty');
    el.classList.remove('bad');
    return;
  }
  el.classList.remove('empty');
  el.classList.toggle('bad', !!bad);
  if (link) {
    const a = createEl('a', { href: link, target: '_blank', rel: 'noopener noreferrer' }, v);
    a.style.color = 'inherit';
    a.style.textDecoration = 'underline';
    el.append(a);
  } else {
    el.textContent = v;
  }
}

function setEmpty(els) {
  for (const el of Object.values(els)) {
    if (!el) continue;
    el.textContent = '—';
    el.classList.add('empty');
    el.classList.remove('bad');
  }
}

function setList(count, entries) {
  const list = $('#meta-list');
  const tabCount = $('#meta-count');
  const totalChip = $('#all-meta-count');
  if (tabCount)  tabCount.textContent  = count;
  if (totalChip) totalChip.textContent = count;
  if (!list) return;

  list.innerHTML = '';
  if (count === 0) {
    list.append(createEl('div', { class: 'empty-state' }, 'メタデータは検出されませんでした'));
    return;
  }

  for (const [k, v] of entries) {
    const row = createEl('div', { class: 'meta-row' });
    if (k.startsWith('GPS:')) row.classList.add('gps');
    else {
      const bare = k.includes(':') ? k.split(':').pop() : k;
      if (SENSITIVE_FIELDS.has(bare)) row.classList.add('sens');
    }
    row.append(
      createEl('div', { class: 'k' }, k),
      createEl('div', { class: 'v' }, String(v))
    );
    list.append(row);
  }
}

function categorize(all, summary) {
  const cats = {};
  cats['GPS']    = !!summary.gps;
  cats['撮影日時'] = !!summary.date;
  cats['デバイス'] = !!summary.device;
  cats['ソフト']  = !!summary.soft;
  cats['XMP']    = Object.keys(all).some(k => k.startsWith('XMP:'));
  cats['ICC']    = Object.keys(all).some(k => k.startsWith('ICC:') || k.startsWith('iCCP:'));
  cats['IPTC']   = 'IPTC' in all;
  return cats;
}

function setCategories(cats) {
  const box = $('#meta-cats');
  if (!box) return;
  box.innerHTML = '';
  const entries = Object.entries(cats);
  if (entries.every(([, v]) => !v)) {
    box.append(createEl('span', { class: 'cat-chip ok' }, '✓ 機密データは検出されませんでした'));
    return;
  }
  for (const [name, present] of entries) {
    if (!present) continue;
    const cls = (name === 'GPS') ? 'cat-chip danger' : 'cat-chip warn';
    box.append(createEl('span', { class: cls }, name));
  }
}
