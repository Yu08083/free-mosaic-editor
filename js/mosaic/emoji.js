// js/mosaic/emoji.js — solid background + centered emoji
import { clipShape } from './_shape.js';

export function emoji(ctx, source, rect, opts) {
  const { x, y, w, h } = rect;
  if (w <= 1 || h <= 1) return;

  ctx.save();
  clipShape(ctx, rect, opts);
  ctx.fillStyle = opts.bg || '#000';
  ctx.fillRect(x, y, w, h);

  const fs = Math.min(w, h) * 0.78;
  ctx.font = `${fs}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.emoji || '⬛', x + w / 2, y + h / 2);
  ctx.restore();
}
