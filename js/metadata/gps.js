// js/metadata/gps.js — GPS coordinate helpers

export function dmsToDecimal(dms, ref) {
  if (!Array.isArray(dms) || dms.length < 3) return null;
  let v = dms[0] + dms[1] / 60 + dms[2] / 3600;
  if (ref === 'S' || ref === 'W') v = -v;
  return v;
}

export function formatCoordinate(lat, lon) {
  if (lat == null || lon == null) return null;
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

export function buildMapsUrl(lat, lon) {
  if (lat == null || lon == null) return null;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`;
}
