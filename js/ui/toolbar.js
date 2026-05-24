import { $, $$ } from '../core/dom.js';
import {
  state, setToolType, setToolOpt, applyCurrentToolToSelected,
  reseedSelected, getRegion, deleteRegion, selectRegion, setRegionTime,
} from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { fmtTime } from '../core/utils.js';
import { render as renderStage } from './stage.js';

const STRENGTH_RANGES = {
  pixelate:    { min: 2, max: 80, step: 1, unit: 'px', default: 16 },
  blur:        { min: 2, max: 60, step: 1, unit: 'px', default: 16 },
  noise:       { min: 2, max: 80, step: 1, unit: 'px', default: 16 },
  frosted:     { min: 2, max: 40, step: 1, unit: 'px', default: 12 },
  scramble:    { min: 4, max: 60, step: 1, unit: 'px', default: 14 },
  halftone:    { min: 4, max: 30, step: 1, unit: 'px', default: 10 },
  crystallize: { min: 6, max: 50, step: 1, unit: 'px', default: 18 },
  swirl:       { min: 5, max: 80, step: 1, unit: '',   default: 30 },
};

const APPLIES_REGION = true;
const SKIPS_REGION = false;

function bindSlider(id, labelId, optKey, format = v => v, applyToRegion = APPLIES_REGION) {
  const input = $(id);
  const label = $(labelId);
  input.addEventListener('input', e => {
    const v = +e.target.value;
    setToolOpt(optKey, v);
    label.textContent = format(v);
    if (applyToRegion) applyCurrentToolToSelected();
  });
}

function bindColor(id, optKey) {
  $(id).addEventListener('input', e => {
    setToolOpt(optKey, e.target.value);
    applyCurrentToolToSelected();
  });
}

function bindSegGroup(containerId, onPick) {
  $(containerId).addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    $$(`${containerId} button`).forEach(x => x.classList.toggle('active', x === b));
    onPick(b);
  });
}

export function initToolbar() {
  bindSegGroup('#seg-type', b => {
    const t = b.dataset.type;
    setToolType(t);
    applyStrengthRange(t);
    syncFieldVisibility();
    applyCurrentToolToSelected();
  });

  bindSegGroup('#seg-shape', b => {
    setToolOpt('shape', b.dataset.shape);
    applyCurrentToolToSelected();
  });

  bindSegGroup('#seg-emoji', b => {
    setToolOpt('emoji', b.dataset.e);
    applyCurrentToolToSelected();
  });

  $('#strength').addEventListener('input', e => {
    setToolOpt('strength', +e.target.value);
    updateStrengthLabel();
    applyCurrentToolToSelected();
  });

  bindColor('#fill-color', 'color');
  bindSlider('#fill-opacity', '#v-fill-opacity', 'fillOpacity', v => `${v}%`);

  $('#fill-opacity').addEventListener('input', e => {
    setToolOpt('fillOpacity', +e.target.value / 100);
  });

  $('#emoji-custom').addEventListener('input', e => {
    if (!e.target.value) return;
    setToolOpt('emoji', e.target.value);
    applyCurrentToolToSelected();
  });

  bindColor('#emoji-bg', 'emojiBg');
  bindColor('#halftone-color', 'halftoneColor');
  bindColor('#halftone-bg', 'halftoneBg');

  bindSlider('#noise-amount', '#v-noise-amount', 'noiseAmount');

  $('#btn-reseed').addEventListener('click', () => reseedSelected());

  bindTimeRange();

  on(EVENTS.REGION_SELECTED, () => {
    if (state.selectedId != null) syncFromSelected();
    else syncTimeFromSelected();
  });
  on(EVENTS.FILE_LOADED, syncTimeFromSelected);
  on(EVENTS.FILE_CLEARED, () => { $('#f-time').hidden = true; });

  applyStrengthRange(state.tool.type);
  syncFieldVisibility();
}

function bindTimeRange() {
  const sStart = $('#t-start');
  const sEnd   = $('#t-end');

  sStart.addEventListener('input', () => {
    if (state.selectedId == null || !state.video) return;
    const dur = state.video.duration;
    let t0 = (+sStart.value / 1000) * dur;
    const r = getRegion(state.selectedId);
    const t1 = r.t1 != null ? r.t1 : dur;
    if (t0 > t1 - 0.05) t0 = Math.max(0, t1 - 0.05);
    setRegionTime(state.selectedId, t0, r.t1);
    updateTimeLabels(t0, t1);
    renderStage();
  });
  sEnd.addEventListener('input', () => {
    if (state.selectedId == null || !state.video) return;
    const dur = state.video.duration;
    let t1 = (+sEnd.value / 1000) * dur;
    const r = getRegion(state.selectedId);
    const t0 = r.t0 != null ? r.t0 : 0;
    if (t1 < t0 + 0.05) t1 = Math.min(dur, t0 + 0.05);
    setRegionTime(state.selectedId, r.t0, t1);
    updateTimeLabels(t0, t1);
    renderStage();
  });

  $('#t-set-start').addEventListener('click', () => {
    if (state.selectedId == null || !state.video) return;
    const t = state.video.currentTime;
    const r = getRegion(state.selectedId);
    const t1 = r.t1 != null ? r.t1 : state.video.duration;
    setRegionTime(state.selectedId, t, Math.max(t1, t + 0.05));
    syncTimeFromSelected();
  });
  $('#t-set-end').addEventListener('click', () => {
    if (state.selectedId == null || !state.video) return;
    const t = state.video.currentTime;
    const r = getRegion(state.selectedId);
    const t0 = r.t0 != null ? r.t0 : 0;
    setRegionTime(state.selectedId, Math.min(t0, t - 0.05), t);
    syncTimeFromSelected();
  });
  $('#t-reset').addEventListener('click', () => {
    if (state.selectedId == null) return;
    setRegionTime(state.selectedId, null, null);
    syncTimeFromSelected();
  });
}

function updateTimeLabels(t0, t1) {
  $('#t-start-v').textContent = fmtTime(t0);
  $('#t-end-v').textContent = fmtTime(t1);
  const r = state.selectedId != null ? getRegion(state.selectedId) : null;
  const isFull = !r || (r.t0 == null && r.t1 == null);
  $('#v-time').textContent = isFull ? '全範囲' : `${fmtTime(t0)} – ${fmtTime(t1)}`;
}

function syncTimeFromSelected() {
  if (state.mediaType !== 'video' || !state.video) {
    $('#f-time').hidden = true;
    return;
  }
  if (state.selectedId == null) {
    $('#f-time').hidden = true;
    return;
  }
  const r = getRegion(state.selectedId);
  if (!r) {
    $('#f-time').hidden = true;
    return;
  }
  $('#f-time').hidden = false;
  const dur = state.video.duration || 1;
  const t0 = r.t0 != null ? r.t0 : 0;
  const t1 = r.t1 != null ? r.t1 : dur;
  $('#t-start').value = Math.round((t0 / dur) * 1000);
  $('#t-end').value   = Math.round((t1 / dur) * 1000);
  updateTimeLabels(t0, t1);
}

function applyStrengthRange(type) {
  const r = STRENGTH_RANGES[type];
  if (!r) return;
  const slider = $('#strength');
  slider.min  = r.min;
  slider.max  = r.max;
  slider.step = r.step;
  let v = state.tool.strength;
  if (v < r.min || v > r.max) {
    v = r.default;
    state.tool.strength = v;
  }
  slider.value = v;
  updateStrengthLabel();
}

function updateStrengthLabel() {
  const r = STRENGTH_RANGES[state.tool.type];
  const unit = (r && r.unit) ? ` ${r.unit}` : '';
  $('#v-strength').textContent = `${state.tool.strength}${unit}`;
}

function syncFieldVisibility() {
  const t = state.tool.type;
  $('#f-strength').hidden        = !STRENGTH_RANGES[t];
  $('#f-color').hidden           = (t !== 'fill');
  $('#f-fill-opacity').hidden    = (t !== 'fill');
  $('#f-emoji').hidden           = (t !== 'emoji');
  $('#f-emoji-bg').hidden        = (t !== 'emoji');
  $('#f-noise').hidden           = (t !== 'noise');
  $('#f-halftone-colors').hidden = (t !== 'halftone');
  $('#f-reseed').hidden          = !['frosted', 'scramble', 'crystallize'].includes(t);
}

function syncFromSelected() {
  const id = state.selectedId;
  if (id == null) return;
  const r = getRegion(id);
  if (!r) return;

  state.tool.type = r.type;
  $$('#seg-type button').forEach(b => b.classList.toggle('active', b.dataset.type === r.type));
  applyStrengthRange(r.type);

  const o = r.opts || {};
  if (o.shape) {
    state.tool.shape = o.shape;
    $$('#seg-shape button').forEach(b => b.classList.toggle('active', b.dataset.shape === o.shape));
  }
  if (o.strength != null) {
    state.tool.strength = o.strength;
    $('#strength').value = o.strength;
    updateStrengthLabel();
  }

  if (r.type === 'fill') {
    if (o.color != null) {
      state.tool.color = o.color;
      $('#fill-color').value = o.color;
    }
    if (o.opacity != null) {
      state.tool.fillOpacity = o.opacity;
      $('#fill-opacity').value = Math.round(o.opacity * 100);
      $('#v-fill-opacity').textContent = `${Math.round(o.opacity * 100)}%`;
    }
  } else if (r.type === 'emoji') {
    if (o.emoji) {
      state.tool.emoji = o.emoji;
      $$('#seg-emoji button').forEach(b => b.classList.toggle('active', b.dataset.e === o.emoji));
    }
    if (o.bg) {
      state.tool.emojiBg = o.bg;
      $('#emoji-bg').value = o.bg;
    }
  } else if (r.type === 'halftone') {
    if (o.color) {
      state.tool.halftoneColor = o.color;
      $('#halftone-color').value = o.color;
    }
    if (o.bg) {
      state.tool.halftoneBg = o.bg;
      $('#halftone-bg').value = o.bg;
    }
  } else if (r.type === 'noise') {
    if (o.amount != null) {
      state.tool.noiseAmount = o.amount;
      $('#noise-amount').value = o.amount;
      $('#v-noise-amount').textContent = `${o.amount}`;
    }
  }

  syncFieldVisibility();
  syncTimeFromSelected();
}

window.addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (state.selectedId != null) {
      deleteRegion(state.selectedId);
      e.preventDefault();
    }
  } else if (e.key === 'Escape') {
    selectRegion(null);
  }
});
