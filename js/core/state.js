// js/core/state.js — global app state (intentionally simple)
import { emit, EVENTS } from './events.js';
import { randomSeed } from '../mosaic/_seed.js';

export const state = {
  // file
  file: null,
  mediaType: null,         // 'image' | 'video' | null
  img: null,
  video: null,
  natW: 0,
  natH: 0,

  // display
  scale: 1,                // canvas px = nat * scale
  videoPlaying: false,
  rafId: null,

  // regions
  regions: [],             // {id,x,y,w,h,type,opts:{...}}
  selectedId: null,
  draft: null,             // currently-drawing region
  dragMode: null,          // 'create' | 'move' | 'resize' | null
  resizeHandle: null,
  dragStart: null,

  // current tool
  tool: {
    type: 'pixelate',
    strength: 16,           // generic strength; meaning depends on type
    color: '#000000',       // fill color
    fillOpacity: 1.0,
    emoji: '🙂',
    emojiBg: '#000000',     // background behind emoji
    shape: 'rect',          // 'rect' | 'ellipse'
    noiseAmount: 80,        // 0..255
    halftoneColor: '#000000',
    halftoneBg:    '#ffffff',
  },

  // metadata
  metadata: null,

  // export
  out: {
    format: 'image/jpeg',
    quality: 0.92,
    scale: 1.0,
    fps: 30,
    audio: true,
    videoBitrate: 6_000_000,
  },
};

let _nextId = 1;
export function nextRegionId() { return _nextId++; }

/* ---- region helpers ---- */

export function addRegion(rect) {
  const r = {
    id: nextRegionId(),
    x: rect.x, y: rect.y, w: rect.w, h: rect.h,
    type: state.tool.type,
    opts: cloneToolOpts(),
    t0: null,
    t1: null,
  };
  state.regions.push(r);
  state.selectedId = r.id;
  emit(EVENTS.REGIONS_CHANGED);
  emit(EVENTS.REGION_SELECTED, r.id);
  return r;
}

export function isRegionActiveAt(region, time) {
  if (region.t0 != null && time < region.t0) return false;
  if (region.t1 != null && time > region.t1) return false;
  return true;
}

export function setRegionTime(id, t0, t1) {
  const r = getRegion(id);
  if (!r) return;
  r.t0 = t0;
  r.t1 = t1;
  emit(EVENTS.REGIONS_CHANGED);
}

export function getRegion(id) {
  return state.regions.find(r => r.id === id) || null;
}

export function selectRegion(id) {
  state.selectedId = id;
  emit(EVENTS.REGION_SELECTED, id);
}

export function deleteRegion(id) {
  const idx = state.regions.findIndex(r => r.id === id);
  if (idx === -1) return;
  state.regions.splice(idx, 1);
  if (state.selectedId === id) state.selectedId = null;
  emit(EVENTS.REGIONS_CHANGED);
}

export function clearRegions() {
  state.regions = [];
  state.selectedId = null;
  emit(EVENTS.REGIONS_CHANGED);
}

export function updateRegion(id, patch) {
  const r = getRegion(id);
  if (!r) return;
  Object.assign(r, patch);
  emit(EVENTS.REGIONS_CHANGED);
}

export function updateRegionOpts(id, optsPatch) {
  const r = getRegion(id);
  if (!r) return;
  r.opts = { ...r.opts, ...optsPatch };
  emit(EVENTS.REGIONS_CHANGED);
}

export function setToolType(type) {
  state.tool.type = type;
  emit(EVENTS.TOOL_CHANGED, type);
}

export function setToolOpt(key, value) {
  state.tool[key] = value;
  emit(EVENTS.TOOL_CHANGED, key);
}

export function cloneToolOpts() {
  // Pick only the options relevant to the current tool type.
  const t = state.tool.type;
  const s = state.tool;
  const base = { shape: s.shape };
  switch (t) {
    case 'pixelate':    return { ...base, strength: s.strength };
    case 'blur':        return { ...base, strength: s.strength };
    case 'fill':        return { ...base, color: s.color, opacity: s.fillOpacity };
    case 'emoji':       return { ...base, emoji: s.emoji, bg: s.emojiBg };
    case 'noise':       return { ...base, amount: s.noiseAmount, strength: s.strength };
    case 'frosted':     return { ...base, strength: s.strength, seed: randomSeed() };
    case 'scramble':    return { ...base, strength: s.strength, seed: randomSeed() };
    case 'halftone':    return { ...base, strength: s.strength, color: s.halftoneColor, bg: s.halftoneBg };
    case 'crystallize': return { ...base, strength: s.strength, seed: randomSeed() };
    case 'swirl':       return { ...base, strength: s.strength };
    default:            return base;
  }
}

export function applyCurrentToolToSelected() {
  if (!state.selectedId) return;
  const r = getRegion(state.selectedId);
  if (!r) return;
  const sameType = (r.type === state.tool.type);
  const newOpts = cloneToolOpts();
  // Preserve the existing seed so adjusting a slider doesn't re-shuffle every
  // video frame. (Type-change still gets a fresh seed.)
  if (sameType && r.opts && r.opts.seed != null && newOpts.seed != null) {
    newOpts.seed = r.opts.seed;
  }
  r.type = state.tool.type;
  r.opts = newOpts;
  emit(EVENTS.REGIONS_CHANGED);
}

export function reseedSelected() {
  if (!state.selectedId) return;
  const r = getRegion(state.selectedId);
  if (!r || !r.opts) return;
  if (r.opts.seed == null) return;
  r.opts.seed = randomSeed();
  emit(EVENTS.REGIONS_CHANGED);
}

export function resetFile() {
  state.file = null;
  state.mediaType = null;
  state.img = null;
  state.video = null;
  state.natW = state.natH = 0;
  state.regions = [];
  state.selectedId = null;
  state.metadata = null;
  state.videoPlaying = false;
  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.rafId = null;
  emit(EVENTS.FILE_CLEARED);
}
