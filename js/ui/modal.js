// js/ui/modal.js — progress modal
import { $ } from '../core/dom.js';

export function showModal(title, msg) {
  $('#mod-title').textContent = title;
  $('#mod-msg').textContent = msg || '';
  $('#mod-bar').style.width = '0%';
  $('#modal').classList.add('show');
}

export function setProgress(percent, msg) {
  $('#mod-bar').style.width = `${Math.min(100, Math.max(0, percent))}%`;
  if (msg != null) $('#mod-msg').textContent = msg;
}

export function hideModal() {
  $('#modal').classList.remove('show');
}
