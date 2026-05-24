// js/mosaic/halftone.js — newsprint-style dot pattern. Dot size proportional to darkness.
import { clipShape } from './_shape.js';

export function halftone(ctx, source, rect, opts) {
  const { x, y, w, h } = rect;
  if (w <= 1 || h <= 1) return;

  const dot = Math.max(4, opts.strength || 10);
  const cols = Math.max(1, Math.ceil(w / dot));
  const rows = Math.max(1, Math.ceil(h / dot));

  // Downsample the source to one pixel per dot cell.
  const tmp = document.createElement('canvas');
  tmp.width = cols; tmp.height = rows;
  const tc = tmp.getContext('2d');
  tc.drawImage(source, x, y, w, h, 0, 0, cols, rows);
  const sample = tc.getImageData(0, 0, cols, rows);

  ctx.save();
  clipShape(ctx, rect, opts);

  // Background
  ctx.fillStyle = opts.bg || '#ffffff';
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = opts.color || '#000000';
  const maxR = dot / 2 * 1.2; // a touch larger so darkest cells fully cover the area

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const i = (cy * cols + cx) * 4;
      const r = sample.data[i], g = sample.data[i + 1], b = sample.data[i + 2];
      // Perceived luminance; darkness = 1 means draw a full dot.
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const dark = 1 - lum;
      if (dark < 0.05) continue;
      const radius = maxR * Math.sqrt(dark);
      ctx.beginPath();
      ctx.arc(
        x + cx * dot + dot / 2,
        y + cy * dot + dot / 2,
        radius, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }

  ctx.restore();
}
