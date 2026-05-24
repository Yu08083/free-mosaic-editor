// js/ui/dropzone.js — file picker + drag & drop
import { $ } from '../core/dom.js';
import { emit, EVENTS } from '../core/events.js';
import { loadDemo } from '../export/demo.js';

let onFileCb = null;

export function initDropzone(onFile) {
  onFileCb = onFile;

  const fileInput = $('#file');
  const drop = $('#drop');

  fileInput.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) onFileCb(f);
    fileInput.value = ''; // allow reselecting the same file
  });

  $('#btn-new').addEventListener('click', () => fileInput.click());
  $('#btn-demo').addEventListener('click', async () => {
    const f = await loadDemo();
    if (f) onFileCb(f);
  });

  // Drag & drop on the whole window for ease of use.
  ['dragenter', 'dragover'].forEach(ev => {
    window.addEventListener(ev, e => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      drop.classList.add('dragover');
    });
  });
  ['dragleave'].forEach(ev => {
    window.addEventListener(ev, e => {
      e.preventDefault();
      if (e.target === document || e.target === document.documentElement) {
        drop.classList.remove('dragover');
      }
    });
  });
  window.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('dragover');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) onFileCb(f);
  });
}

function hasFiles(e) {
  return e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
}
