// js/core/utils.js — small utilities

export function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1048576).toFixed(2)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

export function fmtTime(seconds) {
  const s = Math.max(0, seconds || 0);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function tick(ms = 16) {
  return new Promise(r => setTimeout(r, ms));
}

export function scaleRect(rect, scale) {
  return {
    x: Math.round(rect.x * scale),
    y: Math.round(rect.y * scale),
    w: Math.round(rect.w * scale),
    h: Math.round(rect.h * scale),
  };
}

export function pickExtension(mime) {
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg':  'jpg',
    'image/png':  'png',
    'image/webp': 'webp',
  };
  if (map[mime]) return map[mime];
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4'))  return 'mp4';
  return 'bin';
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
}

export function basename(path) {
  return String(path).replace(/\.[^.]+$/, '');
}

export function asciiOnly(s, maxLen = 250) {
  // Used for previewing potentially binary metadata blobs
  let out = '';
  for (let i = 0; i < s.length && out.length < maxLen; i++) {
    const c = s.charCodeAt(i);
    if (c >= 32 && c < 127) out += s[i];
    else if (c === 0) break;
    else out += '·';
  }
  return out;
}
