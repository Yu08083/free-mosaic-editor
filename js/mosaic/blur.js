// js/mosaic/blur.js — Gaussian blur via canvas filter
import { clipShape } from './_shape.js';

export function blur(ctx, source, rect, opts) {
  const { x, y, w, h } = rect;
  if (w <= 1 || h <= 1) return;
  const r = Math.max(2, opts.strength || 16);

  // Expand source slightly so edges blur from neighbors
  const pad = Math.min(r * 2, x, y, source.width - (x + w), source.height - (y + h));
  const ex = x - pad, ey = y - pad;
  const ew = w + pad * 2, eh = h + pad * 2;

  const expanded = document.createElement('canvas');
  expanded.width = ew; expanded.height = eh;
  expanded.getContext('2d').drawImage(source, ex, ey, ew, eh, 0, 0, ew, eh);

  const blurred = document.createElement('canvas');
  blurred.width = ew; blurred.height = eh;
  const bc = blurred.getContext('2d');
  bc.filter = `blur(${r}px)`;
  bc.drawImage(expanded, 0, 0);

  ctx.save();
  clipShape(ctx, rect, opts);
  ctx.drawImage(blurred, ex, ey);
  ctx.restore();
}
