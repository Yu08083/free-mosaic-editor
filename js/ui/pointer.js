// js/ui/pointer.js — pointer/touch interaction on the canvas
import { $ } from '../core/dom.js';
import { state, addRegion, getRegion, selectRegion } from '../core/state.js';
import { emit, EVENTS } from '../core/events.js';
import { handlePoints, HANDLE_NAMES, render } from './stage.js';

let view;

export function initPointer() {
  view = $('#view');

  view.addEventListener('pointerdown', onDown);
  view.addEventListener('pointermove', onMove);
  view.addEventListener('pointerup', onUp);
  view.addEventListener('pointercancel', () => {
    state.dragMode = null;
    state.draft = null;
    render();
  });
}

function getPt(e) {
  const r = view.getBoundingClientRect();
  // CSS座標(ブラウザ表示サイズ)→canvas pixel buffer座標 への正規化
  // canvas.width と r.width が一致しないケース(CSSで縮小表示時)に必須
  const sx = view.width  / Math.max(1, r.width);
  const sy = view.height / Math.max(1, r.height);
  const cx = (e.clientX - r.left) * sx;
  const cy = (e.clientY - r.top)  * sy;
  // canvas pixel → natural (画像の実寸) 座標
  const nx = clamp(cx, 0, view.width)  / state.scale;
  const ny = clamp(cy, 0, view.height) / state.scale;
  return { x: nx, y: ny, cx, cy };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function onDown(e) {
  if (!state.mediaType) return;
  try { view.setPointerCapture(e.pointerId); } catch (_) {}
  const p = getPt(e);

  // 1) Hit a resize handle of selected region?
  if (state.selectedId != null) {
    const sel = getRegion(state.selectedId);
    if (sel) {
      const scaled = scale(sel);
      const pts = handlePoints(scaled);
      // HIT は CSS換算で 14px。canvas pixelに変換する(縮小表示時は数値が大きくなる)
      const rect = view.getBoundingClientRect();
      const ratio = view.width / Math.max(1, rect.width);
      const HIT = 14 * ratio;
      for (let i = 0; i < pts.length; i++) {
        if (Math.abs(pts[i][0] - p.cx) < HIT && Math.abs(pts[i][1] - p.cy) < HIT) {
          state.dragMode = 'resize';
          state.resizeHandle = HANDLE_NAMES[i];
          state.dragStart = { ...p, r: { ...sel } };
          return;
        }
      }
      if (inside(p, sel)) {
        state.dragMode = 'move';
        state.dragStart = { ...p, r: { ...sel } };
        return;
      }
    }
  }

  // 2) Hit any other region → select & move
  for (let i = state.regions.length - 1; i >= 0; i--) {
    const r = state.regions[i];
    if (inside(p, r)) {
      selectRegion(r.id);
      emit(EVENTS.REGION_SELECTED, r.id);
      state.dragMode = 'move';
      state.dragStart = { ...p, r: { ...r } };
      render();
      return;
    }
  }

  // 3) Otherwise start drawing a new region
  selectRegion(null);
  state.dragMode = 'create';
  state.draft = { x: p.x, y: p.y, w: 0, h: 0 };
  state.dragStart = p;
  render();
}

function onMove(e) {
  if (!state.dragMode) return;
  const p = getPt(e);

  if (state.dragMode === 'create' && state.draft) {
    state.draft.x = Math.min(state.dragStart.x, p.x);
    state.draft.y = Math.min(state.dragStart.y, p.y);
    state.draft.w = Math.abs(p.x - state.dragStart.x);
    state.draft.h = Math.abs(p.y - state.dragStart.y);
    render();
    return;
  }

  const sel = getRegion(state.selectedId);
  if (!sel) return;

  if (state.dragMode === 'move') {
    const dx = p.x - state.dragStart.x;
    const dy = p.y - state.dragStart.y;
    sel.x = clamp(state.dragStart.r.x + dx, 0, state.natW - sel.w);
    sel.y = clamp(state.dragStart.r.y + dy, 0, state.natH - sel.h);
    render();
    return;
  }

  if (state.dragMode === 'resize') {
    const sr = state.dragStart.r;
    const h  = state.resizeHandle;
    const MIN = 4;
    let nx = sr.x, ny = sr.y, nw = sr.w, nh = sr.h;
    if (h.includes('w')) { nx = Math.min(p.x, sr.x + sr.w - MIN); nw = sr.w - (nx - sr.x); }
    if (h.includes('e')) { nw = Math.max(MIN, p.x - sr.x); }
    if (h.includes('n')) { ny = Math.min(p.y, sr.y + sr.h - MIN); nh = sr.h - (ny - sr.y); }
    if (h.includes('s')) { nh = Math.max(MIN, p.y - sr.y); }
    sel.x = Math.max(0, nx);
    sel.y = Math.max(0, ny);
    sel.w = Math.min(state.natW - sel.x, nw);
    sel.h = Math.min(state.natH - sel.y, nh);
    render();
  }
}

function onUp(e) {
  try { view.releasePointerCapture(e.pointerId); } catch (_) {}

  if (state.dragMode === 'create' && state.draft) {
    if (state.draft.w > 6 && state.draft.h > 6) {
      addRegion(state.draft);
    }
    state.draft = null;
  } else if (state.dragMode === 'move' || state.dragMode === 'resize') {
    emit(EVENTS.REGIONS_CHANGED);
  }

  state.dragMode = null;
  state.resizeHandle = null;
  state.dragStart = null;
  render();
}

function inside(p, r) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function scale(r) {
  return {
    x: r.x * state.scale,
    y: r.y * state.scale,
    w: r.w * state.scale,
    h: r.h * state.scale,
  };
}
