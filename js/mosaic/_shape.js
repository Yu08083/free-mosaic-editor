// js/mosaic/_shape.js — clip path for rectangular or elliptical regions
export function clipShape(ctx, rect, opts) {
  ctx.beginPath();
  if (opts.shape === 'ellipse') {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    ctx.ellipse(cx, cy, rect.w / 2, rect.h / 2, 0, 0, Math.PI * 2);
  } else {
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.clip();
}
