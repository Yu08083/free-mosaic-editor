// js/metadata/webp.js — WebP RIFF chunk parser
import { parseTiff } from './tiff.js';

export function parseWebp(dv, all, summary) {
  if (dv.byteLength < 12) return;
  const riff = readAscii(dv, 0, 4);
  const webp = readAscii(dv, 8, 4);
  if (riff !== 'RIFF' || webp !== 'WEBP') return;

  let off = 12;
  while (off + 8 <= dv.byteLength) {
    const fcc  = readAscii(dv, off, 4);
    const size = dv.getUint32(off + 4, true);
    const dataStart = off + 8;
    if (dataStart + size > dv.byteLength) break;

    if (fcc === 'EXIF') {
      let tBase = dataStart;
      if (size > 6 &&
          dv.getUint32(tBase) === 0x45786966 &&
          dv.getUint16(tBase + 4) === 0x0000) {
        tBase += 6;
      }
      parseTiff(dv, tBase, all, summary);
    } else if (fcc === 'XMP ') {
      all['WebP:XMP'] = `present (${size} bytes)`;
    } else if (fcc === 'ICCP') {
      all['WebP:ICCP'] = `present (${size} bytes)`;
    } else if (fcc === 'VP8X' && size >= 10) {
      const flags = dv.getUint8(dataStart);
      const features = [];
      if (flags & 0x10) features.push('ICCP');
      if (flags & 0x08) features.push('alpha');
      if (flags & 0x04) features.push('EXIF');
      if (flags & 0x02) features.push('XMP');
      if (flags & 0x01) features.push('animation');
      all['WebP:Features'] = features.join(', ') || 'none';
      // 24-bit width-1 and height-1 (little-endian)
      const w = (dv.getUint8(dataStart + 4)) | (dv.getUint8(dataStart + 5) << 8) | (dv.getUint8(dataStart + 6) << 16);
      const h = (dv.getUint8(dataStart + 7)) | (dv.getUint8(dataStart + 8) << 8) | (dv.getUint8(dataStart + 9) << 16);
      all['WebP:Width']  = w + 1;
      all['WebP:Height'] = h + 1;
    }

    off = dataStart + size + (size % 2); // chunks are word-aligned
  }
}

function readAscii(dv, off, len) {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(dv.getUint8(off + i));
  return s;
}
