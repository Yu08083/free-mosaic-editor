// js/export/video.js — re-encode video with regions baked in via MediaRecorder
import { state, isRegionActiveAt } from '../core/state.js';
import { applyMosaic } from '../mosaic/index.js';
import { downloadBlob, pickExtension, basename, fmtTime } from '../core/utils.js';
import { showModal, setProgress, hideModal } from '../ui/modal.js';
import { togglePlay } from '../ui/videoControls.js';

export async function exportVideo() {
  if (state.mediaType !== 'video' || !state.video) return;
  if (!('MediaRecorder' in window)) {
    alert('お使いのブラウザは MediaRecorder に対応していません。');
    return;
  }

  const v = state.video;
  // Pause UI playback during export
  if (!v.paused) togglePlay();

  showModal('動画を書き出し中', '初期化中…');

  const W = Math.round(state.natW * state.out.scale);
  const H = Math.round(state.natH * state.out.scale);

  const exp = document.createElement('canvas');
  exp.width = W;
  exp.height = H;
  const ec = exp.getContext('2d');

  const fps = state.out.fps;
  const stream = exp.captureStream(fps);

  // Audio via Web Audio API (silent local playback, full capture into stream).
  // We attach this once per video element so re-export reuses the same graph.
  if (state.out.audio) {
    try {
      if (!v._audioGraph) {
        const AC = window.AudioContext || window.webkitAudioContext;
        const ac = new AC();
        const src = ac.createMediaElementSource(v);
        const dest = ac.createMediaStreamDestination();
        src.connect(dest);
        // intentionally NOT connecting to ac.destination → no audible echo
        v._audioGraph = { ac, src, dest };
      }
      if (v._audioGraph.ac.state === 'suspended') await v._audioGraph.ac.resume();
      for (const t of v._audioGraph.dest.stream.getAudioTracks()) {
        stream.addTrack(t);
      }
      v.muted = false;
    } catch (e) {
      console.warn('audio capture failed', e);
    }
  } else {
    v.muted = true;
  }

  let mime = state.out.format;
  if (MediaRecorder.isTypeSupported && !MediaRecorder.isTypeSupported(mime)) {
    // fallback
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1',
      'video/mp4',
    ];
    mime = candidates.find(m => MediaRecorder.isTypeSupported(m)) || '';
  }

  let rec;
  try {
    rec = new MediaRecorder(stream, mime ? {
      mimeType: mime,
      videoBitsPerSecond: state.out.videoBitrate,
    } : undefined);
  } catch (e) {
    console.warn('MediaRecorder init failed', e);
    try { rec = new MediaRecorder(stream); }
    catch (e2) { alert('録画フォーマットが利用できません'); hideModal(); return; }
  }

  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const finished = new Promise(res => { rec.onstop = res; });

  // Seek to start, then play and draw frames into exp until end.
  v.currentTime = 0;
  await new Promise(r => v.addEventListener('seeked', r, { once: true }));

  rec.start();
  await v.play();
  state.videoPlaying = true;

  const sx = W / state.natW;
  const sy = H / state.natH;
  let stopped = false;

  function loop() {
    if (stopped) return;
    ec.drawImage(v, 0, 0, W, H);
    const t = v.currentTime;
    for (const r of state.regions) {
      if (!isRegionActiveAt(r, t)) continue;
      const rect = {
        x: Math.round(r.x * sx), y: Math.round(r.y * sy),
        w: Math.round(r.w * sx), h: Math.round(r.h * sy),
      };
      applyMosaic(ec, exp, rect, r);
    }
    const pct = Math.min(99, Math.round((v.currentTime / v.duration) * 100));
    setProgress(pct, `${pct}% — ${fmtTime(v.currentTime)} / ${fmtTime(v.duration)}`);

    if (v.ended || v.currentTime >= v.duration - 0.05) {
      stopped = true;
      try { rec.stop(); } catch (_) {}
      v.pause();
      state.videoPlaying = false;
    } else {
      requestAnimationFrame(loop);
    }
  }
  requestAnimationFrame(loop);

  await finished;
  const outType = (chunks[0] && chunks[0].type) || mime || 'video/webm';
  const blob = new Blob(chunks, { type: outType });
  setProgress(100, '完了');

  const ext = pickExtension(outType);
  const name = `${basename(state.file.name)}.redacted.${ext}`;
  downloadBlob(blob, name);
  hideModal();
}
