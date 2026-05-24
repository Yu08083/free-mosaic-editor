// js/mosaic/fill.js — solid color fill (the most secure mosaic)
import { clipShape } from './_shape.js';

export function fill(ctx, source, rect, opts) {
  if (rect.w <= 1 || rect.h <= 1) return;
  ctx.save();
  clipShape(ctx, rect, opts);
  ctx.globalAlpha = opts.opacity == null ? 1 : opts.opacity;
  ctx.fillStyle = opts.color || '#000';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}
