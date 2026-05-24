// js/metadata/index.js — top-level metadata reader
import { parseJpeg } from './jpeg.js';
import { parsePng }  from './png.js';
import { parseWebp } from './webp.js';
import { humanSize } from '../core/utils.js';

export async function readImageMetadata(file) {
  const summary = {
    file: file.name,
    size: humanSize(file.size),
    type: file.type || guessTypeFromName(file.name),
    gps: null,
    gpsLat: null,
    gpsLon: null,
    altitude: null,
    date: null,
    device: null,
    lens: null,
    soft: null,
  };
  const all = {};

  try {
    const buf = await file.arrayBuffer();
    const dv  = new DataView(buf);

    const t = file.type || guessTypeFromName(file.name);
    if (/jpe?g/i.test(t)) {
      parseJpeg(dv, all, summary);
    } else if (/png/i.test(t)) {
      parsePng(dv, all, summary);
    } else if (/webp/i.test(t)) {
      parseWebp(dv, all, summary);
    } else if (/gif/i.test(t)) {
      // GIFs carry no EXIF; just declare format.
      all['Format'] = 'GIF';
    } else {
      // Try JPEG SOI as a fallback for files with wrong/missing MIME.
      if (dv.byteLength > 2 && dv.getUint16(0) === 0xFFD8) parseJpeg(dv, all, summary);
    }
  } catch (err) {
    console.warn('metadata parse error', err);
  }

  return { summary, all };
}

export function buildVideoMetadata(file, videoElement) {
  const summary = {
    file: file.name,
    size: humanSize(file.size),
    type: file.type,
    gps: null,
    date: null,
    device: null,
    lens: null,
    soft: null,
  };
  const all = {
    'File:Name': file.name,
    'File:Size': humanSize(file.size),
    'File:Type': file.type || 'unknown',
  };
  if (videoElement && videoElement.duration) {
    all['Video:Duration'] = `${videoElement.duration.toFixed(2)} s`;
    all['Video:Width']    = `${videoElement.videoWidth} px`;
    all['Video:Height']   = `${videoElement.videoHeight} px`;
  }
  return { summary, all };
}

function guessTypeFromName(name) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!m) return '';
  const ext = m[1];
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png')  return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif')  return 'image/gif';
  return '';
}
