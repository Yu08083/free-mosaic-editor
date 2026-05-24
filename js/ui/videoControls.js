// js/ui/videoControls.js — play/pause and seek for the loaded video
import { $ } from '../core/dom.js';
import { state } from '../core/state.js';
import { render } from './stage.js';

export function initVideoControls() {
  $('#vplay').addEventListener('click', () => togglePlay());
  $('#vseek').addEventListener('input', e => {
    if (!state.video) return;
    state.video.currentTime = (+e.target.value / 1000) * state.video.duration;
    if (!state.videoPlaying) requestAnimationFrame(render);
  });
}

export function togglePlay() {
  if (!state.video) return;
  if (state.video.paused) {
    state.video.play();
    state.videoPlaying = true;
    $('#vplay').textContent = '⏸';
    requestAnimationFrame(render);
  } else {
    state.video.pause();
    state.videoPlaying = false;
    $('#vplay').textContent = '▶';
  }
}

export function showVideoControls(show) {
  $('#vctl').hidden = !show;
}
