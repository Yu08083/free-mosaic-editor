// js/mosaic/_seed.js — seeded PRNG for deterministic per-region randomness.
// Critical for video: without a stable seed, every frame would re-shuffle and flicker.

export function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed() {
  return (Math.random() * 0xFFFFFFFF) >>> 0;
}
