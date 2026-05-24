// js/main.js — entry point: wires everything together
import { $, $$ } from './core/dom.js';
import { state, resetFile } from './core/state.js';
import { emit, EVENTS } from './core/events.js';
import { humanSize, pickExtension, basename } from './core/utils.js';

import { initTabs } from './ui/tabs.js';
import { initDropzone } from './ui/dropzone.js';
import { initStage, render } from './ui/stage.js';
import { initPointer } from './ui/pointer.js';
import { initRegionList } from './ui/regionList.js';
import { initToolbar } from './ui/toolbar.js';
import { initVideoControls, showVideoControls } from './ui/videoControls.js';

import { readImageMetadata, buildVideoMetadata } from './metadata/index.js';
import { renderMetadata } from './metadata/render.js';

import { exportImage } from './export/image.js';
import { exportVideo } from './export/video.js';

// ---------- Boot ----------
initTabs();
initStage();
initPointer();
initRegionList();
initToolbar();
initVideoControls();
initDropzone(loadFile);
initExportPanel();

// ---------- File loading ----------
async function loadFile(file) {
  resetFile();
  state.file = file;
  state.metadata = null;

  const url = URL.createObjectURL(file);

  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
    await loadImage(file, url);
  } else if (file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name)) {
    await loadVideo(file, url);
  } else {
    alert('対応していないファイル形式です');
    return;
  }
}

async function loadImage(file, url) {
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('image load failed'));
    img.src = url;
  });
  state.mediaType = 'image';
  state.img = img;
  state.natW = img.naturalWidth;
  state.natH = img.naturalHeight;

  showCanvas(true);
  showVideoControls(false);
  buildFormatOptions();
  emit(EVENTS.FILE_LOADED);
  updateStatus();

  // Read metadata async
  state.metadata = await readImageMetadata(file);
  renderMetadata();
}

async function loadVideo(file, url) {
  const v = document.createElement('video');
  v.src = url;
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  await new Promise((res, rej) => {
    v.addEventListener('loadedmetadata', res, { once: true });
    v.addEventListener('error', () => rej(new Error('video load failed')), { once: true });
  });
  state.mediaType = 'video';
  state.video = v;
  state.natW = v.videoWidth;
  state.natH = v.videoHeight;

  // Tiny offset to guarantee `seeked` fires (assigning currentTime=0 to an
  // already-0 video does not always emit it).
  v.currentTime = 0.001;
  await Promise.race([
    new Promise(r => v.addEventListener('seeked', r, { once: true })),
    new Promise(r => setTimeout(r, 500)),
  ]);

  showCanvas(true);
  showVideoControls(true);
  buildFormatOptions();
  emit(EVENTS.FILE_LOADED);
  updateStatus();

  state.metadata = buildVideoMetadata(file, v);
  renderMetadata();
}

function showCanvas(show) {
  $('#drop').hidden = show;
  $('#canvas-wrap').hidden = !show;
}

function updateStatus() {
  $('#st-file').textContent = `${state.file.name} · ${humanSize(state.file.size)}`;
  updateEstName();
}

// ---------- Export panel ----------
function bindSlider(id, labelId, onChange, format = v => v) {
  const input = $(id);
  const label = labelId ? $(labelId) : null;
  input.addEventListener('input', e => {
    const v = +e.target.value;
    onChange(v);
    if (label) label.textContent = format(v);
  });
}

function bindToggle(onId, offId, onChange) {
  $(onId).addEventListener('click', () => {
    onChange(true);
    $(onId).classList.add('active');
    $(offId).classList.remove('active');
  });
  $(offId).addEventListener('click', () => {
    onChange(false);
    $(offId).classList.add('active');
    $(onId).classList.remove('active');
  });
}

function initExportPanel() {
  bindSlider('#quality', '#v-quality', v => state.out.quality = v / 100);
  bindSlider('#scale',   '#v-scale',   v => state.out.scale   = v / 100, v => `${v}%`);
  bindSlider('#fps',     '#v-fps',     v => state.out.fps     = v);
  bindSlider('#bitrate', '#v-bitrate', v => state.out.videoBitrate = v * 1_000_000, v => `${v} Mbps`);

  bindToggle('#audio-on', '#audio-off', on => state.out.audio = on);

  $('#btn-export').addEventListener('click', () => {
    if (state.mediaType === 'image') return exportImage();
    if (state.mediaType === 'video') return exportVideo();
  });
}

function buildFormatOptions() {
  const seg = $('#seg-format');
  seg.innerHTML = '';

  let opts;
  if (state.mediaType === 'image') {
    opts = [
      ['image/jpeg', 'JPEG'],
      ['image/png',  'PNG'],
      ['image/webp', 'WebP'],
    ];
  } else {
    opts = [
      ['video/webm;codecs=vp9,opus', 'WebM VP9'],
      ['video/webm;codecs=vp8,opus', 'WebM VP8'],
      ['video/mp4;codecs=avc1',      'MP4 H.264'],
    ].filter(([m]) => MediaRecorder.isTypeSupported
        ? MediaRecorder.isTypeSupported(m)
        : true);
    if (opts.length === 0) opts = [['video/webm', 'WebM']];
  }

  // Show/hide video-specific controls
  $('#f-vopt').hidden = state.mediaType !== 'video';
  $('#f-quality').hidden = (state.mediaType === 'video');

  opts.forEach(([m, n], i) => {
    const b = document.createElement('button');
    b.textContent = n;
    b.dataset.m = m;
    if (i === 0) {
      b.classList.add('active');
      state.out.format = m;
    }
    b.addEventListener('click', () => {
      $$('#seg-format button').forEach(x => x.classList.toggle('active', x === b));
      state.out.format = m;
      updateEstName();
    });
    seg.appendChild(b);
  });
  updateEstName();
}

function updateEstName() {
  const fmt = state.out.format;
  const ext = pickExtension(fmt) ||
    (fmt.includes('webm') ? 'webm' : (fmt.includes('mp4') ? 'mp4' : 'bin'));
  const base = state.file ? basename(state.file.name) : 'output';
  $('#est-name').textContent = `${base}.redacted.${ext}`;
  $('#st-out').textContent = ext.toUpperCase();
}
