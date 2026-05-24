// js/mosaic/swirl.js — angular displacement around the region centre.
// Strength controls maximum twist (in radians) at centre, falling to 0 at edge.
import { clipShape } from './_shape.js';

export function swirl(ctx, source, rect, opts) {
  const { x, y, w, h } = rect;
  if (w <= 1 || h <= 1) return;

  const twist = (opts.strength || 16) / 10; // radians
  const cx = w / 2, cy = h / 2;
  const maxR = Math.max(1, Math.min(w, h) / 2);

  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const tc = tmp.getContext('2d');
  tc.drawImage(source, x, y, w, h, 0, 0, w, h);
  const src = tc.getImageData(0, 0, w, h);
  const dst = tc.createImageData(w, h);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const dx = px - cx, dy = py - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      const di = (py * w + px) * 4;

      if (r > maxR) {
        const si = di;
        dst.data[di]     = src.data[si];
        dst.data[di + 1] = src.data[si + 1];
        dst.data[di + 2] = src.data[si + 2];
        dst.data[di + 3] = 255;
        continue;
      }
      // Falloff so the centre twists most, edges not at all.
      const f = 1 - r / maxR;
      const a = twist * f * f;
      const cosA = Math.cos(a), sinA = Math.sin(a);
      let sx = Math.round(cosA * dx - sinA * dy + cx);
      let sy = Math.round(sinA * dx + cosA * dy + cy);
      if (sx < 0) sx = 0; else if (sx >= w) sx = w - 1;
      if (sy < 0) sy = 0; else if (sy >= h) sy = h - 1;
      const si = (sy * w + sx) * 4;
      dst.data[di]     = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = 255;
    }
  }

  tc.putImageData(dst, 0, 0);

  ctx.save();
  clipShape(ctx, rect, opts);
  ctx.drawImage(tmp, x, y);
  ctx.restore();
}
