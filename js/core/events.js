// js/core/events.js — minimal pub/sub event bus
const listeners = new Map();

export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => off(event, handler);
}

export function off(event, handler) {
  const set = listeners.get(event);
  if (set) set.delete(handler);
}

export function emit(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  for (const fn of set) {
    try { fn(payload); } catch (e) { console.error(`[bus:${event}]`, e); }
  }
}

export const EVENTS = Object.freeze({
  FILE_LOADED: 'file:loaded',
  FILE_CLEARED: 'file:cleared',
  REGIONS_CHANGED: 'regions:changed',
  REGION_SELECTED: 'region:selected',
  TOOL_CHANGED: 'tool:changed',
  METADATA_READY: 'metadata:ready',
  VIDEO_TIME: 'video:time',
  EXPORT_START: 'export:start',
  EXPORT_PROGRESS: 'export:progress',
  EXPORT_DONE: 'export:done',
  STAGE_RESIZE: 'stage:resize',
});
