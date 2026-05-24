// js/ui/stage.js — canvas sizing + render loop
import { $ } from '../core/dom.js';
import { state, getRegion, isRegionActiveAt } from '../core/state.js';
import { on, EVENTS } from '../core/events.js';
import { scaleRect } from '../core/utils.js';
import { applyMosaic } from '../mosaic/index.js';

let view, ctx;

export function initStage() {
  view = $('#view');
  ctx  = view.getContext('2d');

  on(EVENTS.FILE_LOADED, () => {
    resizeCanvas();
    render();
  });
  on(EVENTS.FILE_CLEARED, () => {
    if (ctx) ctx.clearRect(0, 0, view.width, view.height);
  });
  on(EVENTS.REGIONS_CHANGED, render);
  on(EVENTS.REGION_SELECTED, render);

  window.addEventListener('resize', () => {
    if (state.mediaType) { resizeCanvas(); render(); }
  });
}

export function resizeCanvas() {
  if (!state.mediaType) return;
  const stage = $('.stage-inner').getBoundingClientRect();
  const padding = 28;
  const maxW = Math.max(120, stage.width - padding);

  // Estimate max height by reading actual stage box (avoid creating temp DOM nodes)
  const stageHeight = stage.height;
  const maxH = Math.max(120, stageHeight - padding);

  const r = Math.min(maxW / state.natW, maxH / state.natH, 1);
  state.scale = r;
  view.width  = Math.round(state.natW * r);
  view.height = Math.round(state.natH * r);
}

export function render() {
  if (!state.mediaType) return;

  const w = view.width, h = view.height;
  ctx.clearRect(0, 0, w, h);

  if (state.mediaType === 'image') {
    ctx.drawImage(state.img, 0, 0, w, h);
  } else if (state.mediaType === 'video') {
    ctx.drawImage(state.video, 0, 0, w, h);
  }

  // Apply mosaics (regions are in natural coords). For video, only regions
  // whose time range covers the current playback position get rendered.
  const t = (state.mediaType === 'video' && state.video) ? state.video.currentTime : null;
  for (const r of state.regions) {
    if (t != null && !isRegionActiveAt(r, t)) continue;
    applyMosaic(ctx, view, scaleRect(r, state.scale), r);
  }

  // Draft (in-progress drag)
  if (state.draft) {
    drawFrame(scaleRect(state.draft, state.scale), { draft: true });
  }

  // Selection chrome (on top of mosaic)
  if (state.selectedId != null) {
    const sel = getRegion(state.selectedId);
    if (sel) {
      const active = t == null || isRegionActiveAt(sel, t);
      drawFrame(scaleRect(sel, state.scale), { selected: true, inactive: !active });
    }
  } else {
    for (const r of state.regions) {
      const active = t == null || isRegionActiveAt(r, t);
      drawFrame(scaleRect(r, state.scale), { inactive: !active });
    }
  }

  // Update dims badge
  const dims = $('#dims');
  if (dims) dims.textContent = `${state.natW}×${state.natH}`;

  // Video time / loop
  if (state.mediaType === 'video') {
    syncVideoUi();
    if (state.videoPlaying && !state.video.paused) {
      state.rafId = requestAnimationFrame(render);
    }
  }
}

function drawFrame(r, { draft, selected, inactive }) {
  ctx.save();
  ctx.lineWidth = 1.5;
  if (inactive) ctx.globalAlpha = 0.55;
  ctx.strokeStyle = selected ? '#ff6fa8' : (draft ? '#fcd34d' : 'rgba(255,255,255,0.55)');
  ctx.setLineDash((draft || inactive) ? [5, 4] : []);
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

  if (selected) {
    ctx.setLineDash([]);
    // ハンドル描画サイズもCSS表示比率に合わせて拡縮(小さく表示されると見えなくなるため)
    const rect = view.getBoundingClientRect();
    const ratio = rect.width > 0 ? view.width / rect.width : 1;
    const HS = Math.max(8, Math.round(11 * ratio));
    ctx.fillStyle = '#ff6fa8';
    for (const [hx, hy] of handlePoints(r)) {
      ctx.fillRect(hx - HS / 2, hy - HS / 2, HS, HS);
    }
  }
  ctx.restore();
}

export function handlePoints(r) {
  return [
    [r.x,           r.y],
    [r.x + r.w / 2, r.y],
    [r.x + r.w,     r.y],
    [r.x + r.w,     r.y + r.h / 2],
    [r.x + r.w,     r.y + r.h],
    [r.x + r.w / 2, r.y + r.h],
    [r.x,           r.y + r.h],
    [r.x,           r.y + r.h / 2],
  ];
}

export const HANDLE_NAMES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

function syncVideoUi() {
  const v = state.video;
  if (!v || !v.duration) return;
  const seek = $('#vseek');
  const time = $('#vtime');
  if (seek) seek.value = Math.round((v.currentTime / v.duration) * 1000);
  if (time) {
    const { fmtTime } = window.__redact_utils || {};
    // Inline fallback to keep this module decoupled
    time.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`;
  }
}

function fmt(s) {
  s = Math.max(0, s || 0);
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
