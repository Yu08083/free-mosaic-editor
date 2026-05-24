// js/mosaic/scramble.js — chop the region into tiles and shuffle their positions.
// Visually striking AND irreversible (unlike pixelate/blur which can be partially defeated).
import { clipShape } from './_shape.js';
import { mulberry32 } from './_seed.js';

export function scramble(ctx, source, rect, opts) {
  const { x, y, w, h } = rect;
  if (w <= 1 || h <= 1) return;

  const tile = Math.max(4, Math.min(opts.strength || 14, Math.floor(Math.min(w, h) / 2)));
  const cols = Math.ceil(w / tile);
  const rows = Math.ceil(h / tile);
  const n = cols * rows;
  const seed = (opts.seed || 1) >>> 0;
  const rng = mulberry32(seed);

  // Snapshot the source region.
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  tmp.getContext('2d').drawImage(source, x, y, w, h, 0, 0, w, h);

  // Fisher–Yates over indices using the seeded RNG so video frames stay stable.
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = order[i]; order[i] = order[j]; order[j] = t;
  }

  ctx.save();
  clipShape(ctx, rect, opts);

  for (let i = 0; i < n; i++) {
    const srcIdx = order[i];
    const sx = (srcIdx % cols) * tile;
    const sy = Math.floor(srcIdx / cols) * tile;
    const dx = (i % cols) * tile;
    const dy = Math.floor(i / cols) * tile;
    const cw = Math.min(tile, w - sx, w - dx);
    const ch = Math.min(tile, h - sy, h - dy);
    if (cw <= 0 || ch <= 0) continue;
    ctx.drawImage(tmp, sx, sy, cw, ch, x + dx, y + dy, cw, ch);
  }

  ctx.restore();
}
