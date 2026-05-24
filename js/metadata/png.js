// js/metadata/png.js — PNG chunk parser (tEXt / iTXt / zTXt / IHDR / tIME / eXIf)
import { parseTiff } from './tiff.js';
import { asciiOnly } from '../core/utils.js';

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];

export function parsePng(dv, all, summary) {
  if (dv.byteLength < 8) return;
  for (let i = 0; i < 8; i++) if (dv.getUint8(i) !== PNG_SIG[i]) return;

  let off = 8;
  while (off + 12 <= dv.byteLength) {
    const len  = dv.getUint32(off); off += 4;
    const type = String.fromCharCode(
      dv.getUint8(off), dv.getUint8(off + 1), dv.getUint8(off + 2), dv.getUint8(off + 3)
    );
    off += 4;
    if (off + len + 4 > dv.byteLength) break;
    handleChunk(dv, type, off, len, all, summary);
    if (type === 'IEND') break;
    off += len + 4; // data + CRC
  }
}

function handleChunk(dv, type, off, len, all, summary) {
  const bytes = new Uint8Array(dv.buffer, dv.byteOffset + off, len);

  if (type === 'IHDR' && len >= 13) {
    all['PNG:Width']      = dv.getUint32(off);
    all['PNG:Height']     = dv.getUint32(off + 4);
    all['PNG:BitDepth']   = dv.getUint8(off + 8);
    all['PNG:ColorType']  = colorTypeName(dv.getUint8(off + 9));
    all['PNG:Interlace']  = dv.getUint8(off + 12) ? 'Adam7' : 'none';
  }
  else if (type === 'tEXt') {
    const { key, val } = splitNullKV(bytes);
    if (key) all[`tEXt:${key}`] = asciiOnly(val, 250);
  }
  else if (type === 'iTXt') {
    // keyword\0 compFlag(1) compMethod(1) lang\0 transKey\0 text
    let z = bytes.indexOf(0);
    if (z < 0) return;
    const key = bytesToString(bytes.slice(0, z));
    const compFlag = bytes[z + 1];
    let p = z + 3;
    const lang = bytesToString(takeUntilNull(bytes, p)); p += lang.length + 1;
    const trans = bytesToString(takeUntilNull(bytes, p)); p += trans.length + 1;
    const text = compFlag ? '[compressed]' : bytesToString(bytes.slice(p));
    all[`iTXt:${key}`] = asciiOnly(text, 250);
  }
  else if (type === 'zTXt') {
    const { key } = splitNullKV(bytes);
    if (key) all[`zTXt:${key}`] = '[compressed]';
  }
  else if (type === 'tIME' && len >= 7) {
    const y = dv.getUint16(off);
    const mo = dv.getUint8(off + 2);
    const d  = dv.getUint8(off + 3);
    const h  = dv.getUint8(off + 4);
    const mi = dv.getUint8(off + 5);
    const se = dv.getUint8(off + 6);
    const date = `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${pad(mi)}:${pad(se)}`;
    all['PNG:LastModified'] = date;
    if (!summary.date) summary.date = date;
  }
  else if (type === 'eXIf' && len > 0) {
    // PNG can embed raw EXIF/TIFF as of PNG 3rd edition
    parseTiff(dv, off, all, summary);
  }
  else if (type === 'iCCP') {
    const { key } = splitNullKV(bytes);
    all['iCCP:Profile'] = key || 'present';
  }
  else if (type === 'pHYs' && len >= 9) {
    const ppx = dv.getUint32(off);
    const ppy = dv.getUint32(off + 4);
    const unit = dv.getUint8(off + 8);
    all['PNG:pHYs'] = `${ppx}×${ppy} ${unit === 1 ? 'per meter' : '(unitless)'}`;
  }
}

function colorTypeName(n) {
  return ({0:'grayscale',2:'RGB',3:'palette',4:'grayscale+alpha',6:'RGBA'})[n] || `type ${n}`;
}

function bytesToString(arr) {
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return s;
}

function takeUntilNull(arr, from) {
  let i = from;
  while (i < arr.length && arr[i] !== 0) i++;
  return arr.slice(from, i);
}

function splitNullKV(bytes) {
  let z = 0;
  while (z < bytes.length && bytes[z] !== 0) z++;
  return {
    key: bytesToString(bytes.slice(0, z)),
    val: bytesToString(bytes.slice(z + 1)),
  };
}

function pad(n) { return String(n).padStart(2, '0'); }
