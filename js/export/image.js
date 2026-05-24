// js/export/image.js — export an image with regions baked in, EXIF stripped
import { state } from '../core/state.js';
import { applyMosaic } from '../mosaic/index.js';
import { downloadBlob, pickExtension, basename, tick } from '../core/utils.js';
import { showModal, setProgress, hideModal } from '../ui/modal.js';

export async function exportImage() {
  if (state.mediaType !== 'image' || !state.img) return;

  showModal('画像を書き出し中', 'メタデータを除去して再エンコードしています…');
  await tick();

  const W = Math.round(state.natW * state.out.scale);
  const H = Math.round(state.natH * state.out.scale);

  const exp = document.createElement('canvas');
  exp.width  = W;
  exp.height = H;
  const ec = exp.getContext('2d');
  ec.drawImage(state.img, 0, 0, W, H);

  const sx = W / state.natW;
  const sy = H / state.natH;
  for (const r of state.regions) {
    const rect = {
      x: Math.round(r.x * sx), y: Math.round(r.y * sy),
      w: Math.round(r.w * sx), h: Math.round(r.h * sy),
    };
    applyMosaic(ec, exp, rect, r);
  }
  setProgress(60, 'エンコード中…');
  await tick();

  const fmt = state.out.format;
  const q   = (fmt === 'image/png') ? undefined : state.out.quality;

  const blob = await new Promise(res => exp.toBlob(res, fmt, q));
  setProgress(100, '完了');

  const name = `${basename(state.file.name)}.redacted.${pickExtension(fmt)}`;
  downloadBlob(blob, name);
  hideModal();
}
