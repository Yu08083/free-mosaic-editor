// js/mosaic/noise.js — pixelate + random noise overlay (harder to reverse)
import { clipShape } from './_shape.js';

export function noise(ctx, source, rect, opts) {
  const { x, y, w, h } = rect;
  if (w <= 1 || h <= 1) return;

  // 1) base pixelation
  const px = Math.max(2, Math.min(opts.strength || 12, Math.min(w, h)));
  const tw = Math.max(1, Math.floor(w / px));
  const th = Math.max(1, Math.floor(h / px));
  const tmp = document.createElement('canvas');
  tmp.width = tw; tmp.height = th;
  tmp.getContext('2d').drawImage(source, x, y, w, h, 0, 0, tw, th);

  ctx.save();
  clipShape(ctx, rect, opts);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, tw, th, x, y, w, h);

  // 2) noise overlay (per-block randomness)
  const amount = Math.max(0, Math.min(255, opts.amount ?? 80));
  const noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = tw;
  noiseCanvas.height = th;
  const nctx = noiseCanvas.getContext('2d');
  const idata = nctx.createImageData(tw, th);
  const data = idata.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 2 * amount;
    data[i] = data[i + 1] = data[i + 2] = 128 + n;
    data[i + 3] = 255;
  }
  nctx.putImageData(idata, 0, 0);

  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.85;
  ctx.drawImage(noiseCanvas, 0, 0, tw, th, x, y, w, h);
  ctx.restore();
}
