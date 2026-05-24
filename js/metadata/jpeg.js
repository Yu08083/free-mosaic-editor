// js/metadata/jpeg.js — JPEG segment scanner (APP0/APP1/COM/etc.)
import { parseTiff } from './tiff.js';
import { asciiOnly } from '../core/utils.js';

export function parseJpeg(dv, all, summary) {
  if (dv.byteLength < 4 || dv.getUint16(0) !== 0xFFD8) return;

  let off = 2;
  while (off < dv.byteLength - 4) {
    if (dv.getUint8(off) !== 0xFF) break;
    const marker = dv.getUint16(off);
    off += 2;
    if (marker === 0xFFDA || marker === 0xFFD9) break; // SOS / EOI
    if (marker === 0xFF01 || (marker >= 0xFFD0 && marker <= 0xFFD7)) continue; // standalone

    if (off + 2 > dv.byteLength) break;
    const size = dv.getUint16(off);
    const dataStart = off + 2;
    const dataEnd = off + size;

    handleSegment(dv, marker, dataStart, dataEnd, all, summary);

    off = dataEnd;
  }
}

function handleSegment(dv, marker, start, end, all, summary) {
  const len = end - start;

  // APP1 — EXIF or XMP
  if (marker === 0xFFE1) {
    if (len >= 6 &&
        dv.getUint32(start)     === 0x45786966 &&  // "Exif"
        dv.getUint16(start + 4) === 0x0000) {
      parseTiff(dv, start + 6, all, summary);
      return;
    }
    // XMP packet
    const head = readAscii(dv, start, Math.min(40, len));
    if (head.startsWith('http://ns.adobe.com/xap/1.0/')) {
      const body = readAscii(dv, start + 29, len - 29);
      extractXmpFields(body, all, summary);
      return;
    }
    all['APP1'] = `unknown (${len} bytes)`;
  }

  // APP0 — JFIF
  else if (marker === 0xFFE0) {
    const ident = readAscii(dv, start, Math.min(5, len));
    if (ident === 'JFIF\0' || ident.startsWith('JFIF')) {
      const major = dv.getUint8(start + 5);
      const minor = dv.getUint8(start + 6);
      all['JFIF:Version'] = `${major}.${String(minor).padStart(2, '0')}`;
      all['JFIF:Units']   = ['none', 'inch', 'cm'][dv.getUint8(start + 7)] || 'unknown';
      all['JFIF:Xdensity'] = dv.getUint16(start + 8);
      all['JFIF:Ydensity'] = dv.getUint16(start + 10);
    }
  }

  // APP2 — ICC profile (just note presence)
  else if (marker === 0xFFE2) {
    const ident = readAscii(dv, start, Math.min(12, len));
    if (ident.startsWith('ICC_PROFILE')) {
      all['ICC:Profile'] = `present (${len} bytes)`;
    }
  }

  // APP13 — IPTC/Photoshop
  else if (marker === 0xFFED) {
    const ident = readAscii(dv, start, Math.min(14, len));
    if (ident.startsWith('Photoshop 3.0')) {
      all['IPTC'] = `present (${len} bytes)`;
    }
  }

  // COM — JPEG comment
  else if (marker === 0xFFFE) {
    const txt = readAscii(dv, start, len);
    if (txt) all['Comment'] = txt;
  }

  // SOF0 — baseline frame: width/height/components
  else if (marker === 0xFFC0 || marker === 0xFFC2) {
    if (len >= 6) {
      all['BitsPerComponent'] = dv.getUint8(start);
      all['ImageHeight'] = dv.getUint16(start + 1);
      all['ImageWidth']  = dv.getUint16(start + 3);
      all['Components']  = dv.getUint8(start + 5);
    }
  }
}

function readAscii(dv, off, len) {
  let s = '';
  for (let i = 0; i < len; i++) {
    const c = dv.getUint8(off + i);
    s += String.fromCharCode(c);
  }
  return s;
}

function extractXmpFields(xmp, all, summary) {
  all['XMP'] = `present (${xmp.length} bytes)`;
  const fields = [
    ['xmp:CreatorTool',   'XMP:CreatorTool'],
    ['xmp:CreateDate',    'XMP:CreateDate'],
    ['xmp:ModifyDate',    'XMP:ModifyDate'],
    ['tiff:Make',         'XMP:Make'],
    ['tiff:Model',        'XMP:Model'],
    ['dc:creator',        'XMP:Creator'],
    ['dc:rights',         'XMP:Rights'],
    ['exif:GPSLatitude',  'XMP:GPSLatitude'],
    ['exif:GPSLongitude', 'XMP:GPSLongitude'],
  ];
  for (const [tag, label] of fields) {
    const re = new RegExp(`${tag.replace(':', '\\:')}\\s*=\\s*"([^"]*)"`, 'i');
    const m = xmp.match(re);
    if (m) all[label] = asciiOnly(m[1]);

    const re2 = new RegExp(`<${tag.replace(':', '\\:')}>([^<]*)<\\/${tag.replace(':', '\\:')}>`, 'i');
    const m2 = xmp.match(re2);
    if (m2 && !all[label]) all[label] = asciiOnly(m2[1].trim());
  }
  if (all['XMP:Make'] && !summary.device) {
    summary.device = `${all['XMP:Make']} ${all['XMP:Model'] || ''}`.trim();
  }
  if (all['XMP:CreatorTool'] && !summary.soft) summary.soft = all['XMP:CreatorTool'];
}
