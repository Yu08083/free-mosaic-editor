// js/mosaic/index.js — dispatch table for mosaic effects
import { pixelate }    from './pixelate.js';
import { blur }        from './blur.js';
import { fill }        from './fill.js';
import { emoji }       from './emoji.js';
import { noise }       from './noise.js';
import { frosted }     from './frosted.js';
import { scramble }    from './scramble.js';
import { halftone }    from './halftone.js';
import { crystallize } from './crystallize.js';
import { swirl }       from './swirl.js';

const EFFECTS = {
  pixelate, blur, fill, emoji, noise,
  frosted, scramble, halftone, crystallize, swirl,
};

export const MOSAIC_TYPES = [
  { id: 'pixelate',    label: 'ピクセル',  secure: false },
  { id: 'blur',        label: 'ブラー',    secure: false },
  { id: 'frosted',     label: 'すりガラス', secure: false },
  { id: 'scramble',    label: 'シャッフル', secure: true  },
  { id: 'halftone',    label: '網点',      secure: true  },
  { id: 'crystallize', label: '結晶化',    secure: true  },
  { id: 'swirl',       label: '渦巻き',    secure: false },
  { id: 'noise',       label: 'ノイズ',    secure: false },
  { id: 'fill',        label: '塗り',      secure: true  },
  { id: 'emoji',       label: '絵文字',    secure: true  },
];

export function applyMosaic(ctx, sourceCanvas, rect, region) {
  if (rect.w <= 1 || rect.h <= 1) return;
  // clamp to canvas
  const x = Math.max(0, rect.x);
  const y = Math.max(0, rect.y);
  const w = Math.min(sourceCanvas.width  - x, rect.w);
  const h = Math.min(sourceCanvas.height - y, rect.h);
  if (w <= 0 || h <= 0) return;

  const effect = EFFECTS[region.type];
  if (!effect) return;
  effect(ctx, sourceCanvas, { x, y, w, h }, region.opts || {});
}
