// js/metadata/tiff.js — TIFF / EXIF IFD parser (used by JPEG, WebP, TIFF, HEIC-derived)
import { TIFF_TAGS, EXIF_TAGS, GPS_TAGS, formatTagValue } from './tags.js';
import { dmsToDecimal, formatCoordinate } from './gps.js';

/**
 * Parse a TIFF block starting at `base` byte offset within `dv`.
 * Writes tag/value pairs into `all` and updates `summary`.
 */
export function parseTiff(dv, base, all, summary) {
  if (base + 8 > dv.byteLength) return;

  const byteOrder = dv.getUint16(base);
  const little = byteOrder === 0x4949;
  if (!little && byteOrder !== 0x4D4D) return;

  const r16 = o => dv.getUint16(o, little);
  const r32 = o => dv.getUint32(o, little);
  const s32 = o => dv.getInt32(o, little);

  if (r16(base + 2) !== 0x002A) return;

  const ifd0Off = base + r32(base + 4);
  const ifd0 = readIfd(dv, base, ifd0Off, little, r16, r32, s32);
  applyTags(ifd0, all, summary, TIFF_TAGS);

  // EXIF SubIFD
  const exifPtr = ifd0.find(t => t.tag === 0x8769);
  if (exifPtr && typeof exifPtr.value === 'number') {
    const exifIfd = readIfd(dv, base, base + exifPtr.value, little, r16, r32, s32);
    applyTags(exifIfd, all, summary, EXIF_TAGS);
  }

  // GPS SubIFD
  const gpsPtr = ifd0.find(t => t.tag === 0x8825);
  if (gpsPtr && typeof gpsPtr.value === 'number') {
    const gpsIfd = readIfd(dv, base, base + gpsPtr.value, little, r16, r32, s32);
    applyGps(gpsIfd, all, summary);
  }
}

function readIfd(dv, base, ifdOff, little, r16, r32, s32) {
  const out = [];
  if (ifdOff < 0 || ifdOff + 2 > dv.byteLength) return out;
  const n = r16(ifdOff);
  for (let i = 0; i < n; i++) {
    const entryOff = ifdOff + 2 + i * 12;
    if (entryOff + 12 > dv.byteLength) break;

    const tag  = r16(entryOff);
    const type = r16(entryOff + 2);
    const cnt  = r32(entryOff + 4);

    const elemSize = TYPE_SIZE[type] || 1;
    const totalSize = elemSize * cnt;

    let value;
    if (totalSize <= 4) {
      value = readValue(dv, entryOff + 8, type, cnt, little, r16, r32, s32);
    } else {
      const ptr = r32(entryOff + 8);
      value = readValue(dv, base + ptr, type, cnt, little, r16, r32, s32);
    }
    out.push({ tag, type, cnt, value });
  }
  return out;
}

const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

function readValue(dv, off, type, cnt, little, r16, r32, s32) {
  if (off < 0 || off >= dv.byteLength) return null;
  try {
    if (type === 2) { // ASCII
      let s = '';
      for (let i = 0; i < cnt; i++) {
        const c = dv.getUint8(off + i);
        if (!c) break;
        s += String.fromCharCode(c);
      }
      return s;
    }
    if (type === 1 || type === 7) { // BYTE / UNDEFINED
      if (cnt === 1) return dv.getUint8(off);
      return null; // skip raw blobs
    }
    if (type === 3) { // SHORT
      if (cnt === 1) return r16(off);
      const a = [];
      for (let i = 0; i < Math.min(cnt, 8); i++) a.push(r16(off + i * 2));
      return a;
    }
    if (type === 4) { // LONG
      if (cnt === 1) return r32(off);
      const a = [];
      for (let i = 0; i < Math.min(cnt, 8); i++) a.push(r32(off + i * 4));
      return a;
    }
    if (type === 5) { // RATIONAL
      const a = [];
      for (let i = 0; i < cnt; i++) {
        const n = r32(off + i * 8);
        const d = r32(off + i * 8 + 4);
        a.push(d === 0 ? 0 : n / d);
      }
      return cnt === 1 ? a[0] : a;
    }
    if (type === 9) return s32(off);
    if (type === 10) {
      const a = [];
      for (let i = 0; i < cnt; i++) {
        const n = s32(off + i * 8);
        const d = s32(off + i * 8 + 4);
        a.push(d === 0 ? 0 : n / d);
      }
      return cnt === 1 ? a[0] : a;
    }
  } catch (e) {
    // ignore truncated entries
  }
  return null;
}

function applyTags(tags, all, summary, dict) {
  for (const t of tags) {
    const name = dict[t.tag];
    if (!name) continue;
    if (name.endsWith('Pointer')) continue; // skip sub-IFD pointers
    all[name] = formatTagValue(name, t.value);

    if (name === 'Make' || name === 'Model') {
      summary.device = `${all.Make || ''} ${all.Model || ''}`.trim();
    }
    if (name === 'Software') summary.soft = String(t.value);
    if (name === 'DateTimeOriginal' || (name === 'DateTime' && !summary.date)) {
      summary.date = String(t.value);
    }
    if (name === 'LensModel') summary.lens = String(t.value);
  }
}

function applyGps(tags, all, summary) {
  const obj = {};
  for (const t of tags) {
    const n = GPS_TAGS[t.tag];
    if (n) obj[n] = t.value;
  }
  const lat = dmsToDecimal(obj.GPSLatitude, obj.GPSLatitudeRef);
  const lon = dmsToDecimal(obj.GPSLongitude, obj.GPSLongitudeRef);

  for (const [k, v] of Object.entries(obj)) {
    all[`GPS:${k}`] = Array.isArray(v) ? v.join(', ') : String(v);
  }
  if (lat != null && lon != null) {
    summary.gps = formatCoordinate(lat, lon);
    summary.gpsLat = lat;
    summary.gpsLon = lon;
    all['GPS:Coordinates'] = summary.gps;
  }
  if (obj.GPSAltitude != null) {
    summary.altitude = `${obj.GPSAltitude} m`;
  }
}
