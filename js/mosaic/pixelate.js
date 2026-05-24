// js/mosaic/pixelate.js — pixelation effect
import { clipShape } from './_shape.js';

export function pixelate(ctx, source, rect, opts) {
  const { x, y, w, h } = rect;
  if (w <= 1 || h <= 1) return;
  const px = Math.max(2, Math.min(opts.strength || 16, Math.min(w, h)));
  const tw = Math.max(1, Math.floor(w / px));
  const th = Math.max(1, Math.floor(h / px));

  const tmp = document.createElement('canvas');
  tmp.width = tw;
  tmp.height = th;
  const tc = tmp.getContext('2d');
  tc.imageSmoothingEnabled = false;
  tc.drawImage(source, x, y, w, h, 0, 0, tw, th);

  ctx.save();
  clipShape(ctx, rect, opts);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, tw, th, x, y, w, h);
  ctx.restore();
}
