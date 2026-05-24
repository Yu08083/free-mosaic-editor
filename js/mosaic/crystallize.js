// js/mosaic/crystallize.js — Voronoi-style crystal cells using a jittered grid.
// Each cell takes the color of its seed point. O(pixels × 9) thanks to grid bucketing.
import { clipShape } from './_shape.js';
import { mulberry32 } from './_seed.js';

export function crystallize(ctx, source, rect, opts) {
  const { x, y, w, h } = rect;
  if (w <= 1 || h <= 1) return;

  const cell = Math.max(6, opts.strength || 18);
  const cols = Math.max(1, Math.ceil(w / cell));
  const rows = Math.max(1, Math.ceil(h / cell));
  const seed = (opts.seed || 1) >>> 0;
  const rng = mulberry32(seed);

  // Source pixel data.
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const tc = tmp.getContext('2d');
  tc.drawImage(source, x, y, w, h, 0, 0, w, h);
  const src = tc.getImageData(0, 0, w, h);

  // Place one seed per grid cell at a jittered position; record its colour.
  const seeds = new Float32Array(cols * rows * 5); // x, y, r, g, b
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const idx = (cy * cols + cx) * 5;
      const sx = Math.min(w - 1, Math.floor(cx * cell + rng() * cell));
      const sy = Math.min(h - 1, Math.floor(cy * cell + rng() * cell));
      const si = (sy * w + sx) * 4;
      seeds[idx]     = sx;
      seeds[idx + 1] = sy;
      seeds[idx + 2] = src.data[si];
      seeds[idx + 3] = src.data[si + 1];
      seeds[idx + 4] = src.data[si + 2];
    }
  }

  const dst = tc.createImageData(w, h);

  // For each pixel find the nearest seed; bucketed search across the 3x3 cell neighbourhood.
  for (let py = 0; py < h; py++) {
    const gy = (py / cell) | 0;
    for (let px = 0; px < w; px++) {
      const gx = (px / cell) | 0;
      let best = Infinity;
      let br = 0, bg = 0, bb = 0;

      for (let dy = -1; dy <= 1; dy++) {
        const ccy = gy + dy;
        if (ccy < 0 || ccy >= rows) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const ccx = gx + dx;
          if (ccx < 0 || ccx >= cols) continue;
          const sidx = (ccy * cols + ccx) * 5;
          const sx = seeds[sidx];
          const sy = seeds[sidx + 1];
          const dd = (sx - px) * (sx - px) + (sy - py) * (sy - py);
          if (dd < best) {
            best = dd;
            br = seeds[sidx + 2];
            bg = seeds[sidx + 3];
            bb = seeds[sidx + 4];
          }
        }
      }

      const di = (py * w + px) * 4;
      dst.data[di]     = br;
      dst.data[di + 1] = bg;
      dst.data[di + 2] = bb;
      dst.data[di + 3] = 255;
    }
  }

  tc.putImageData(dst, 0, 0);

  ctx.save();
  clipShape(ctx, rect, opts);
  ctx.drawImage(tmp, x, y);
  ctx.restore();
}
