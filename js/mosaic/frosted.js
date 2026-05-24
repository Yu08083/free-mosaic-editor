// js/mosaic/frosted.js — frosted glass: random short-range pixel displacement
// + slight blur. Mimics looking through textured/frosted glass.
import { clipShape } from './_shape.js';
import { mulberry32 } from './_seed.js';

export function frosted(ctx, source, rect, opts) {
  const { x, y, w, h } = rect;
  if (w <= 1 || h <= 1) return;

  const strength = Math.max(2, opts.strength || 12);
  const seed = (opts.seed || 1) >>> 0;
  const rng = mulberry32(seed);

  // Pre-blur lightly so the displacement smears soft colors rather than sharp edges.
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const tc = tmp.getContext('2d');
  tc.filter = `blur(${Math.max(1, strength / 6)}px)`;
  tc.drawImage(source, x, y, w, h, 0, 0, w, h);
  tc.filter = 'none';

  const src = tc.getImageData(0, 0, w, h);
  const dst = tc.createImageData(w, h);

  // Process in small tiles so neighbouring pixels share a displacement vector
  // (gives the characteristic chunky frosted-glass texture).
  const tile = 3;
  const range = strength;

  for (let by = 0; by < h; by += tile) {
    for (let bx = 0; bx < w; bx += tile) {
      const ox = Math.floor((rng() - 0.5) * 2 * range);
      const oy = Math.floor((rng() - 0.5) * 2 * range);
      for (let dy = 0; dy < tile; dy++) {
        const py = by + dy;
        if (py >= h) break;
        for (let dx = 0; dx < tile; dx++) {
          const px = bx + dx;
          if (px >= w) break;
          let sx = px + ox;
          let sy = py + oy;
          if (sx < 0) sx = 0; else if (sx >= w) sx = w - 1;
          if (sy < 0) sy = 0; else if (sy >= h) sy = h - 1;
          const si = (sy * w + sx) * 4;
          const di = (py * w + px) * 4;
          dst.data[di]     = src.data[si];
          dst.data[di + 1] = src.data[si + 1];
          dst.data[di + 2] = src.data[si + 2];
          dst.data[di + 3] = 255;
        }
      }
    }
  }

  tc.putImageData(dst, 0, 0);

  ctx.save();
  clipShape(ctx, rect, opts);
  ctx.drawImage(tmp, x, y);
  // Subtle highlight gradient to sell the glass illusion
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.05)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
