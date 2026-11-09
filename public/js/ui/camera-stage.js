// The screen Camera coach and Hands-free share: the person beside the avatar, so you can
// watch the move and yourself together. Each part can be shown or hidden. Hiding your
// picture does not stop the camera, because the counting does not need the picture on screen.

import { t } from '../core/i18n.js';
import { esc } from './html.js';
import { mountFigure, pausePageFigures } from './figure.js';

/** The buttons that show or hide each part. Only Camera coach keeps form notes. */
export function stageControls({ notes = false } = {}) {
  const parts = [['you', t('You')], ['avatar', t('Avatar')], ...(notes ? [['notes', t('Form notes')]] : [])];
  return `<div class="camera-show" role="group" aria-label="${esc(t('Show'))}">
    <span class="camera-show-label">${esc(t('Show'))}</span>
    ${parts.map(([part, label]) => `<button type="button" class="chip" data-part="${part}" aria-pressed="true">${esc(label)}</button>`).join('')}
  </div>`;
}

export function stagePanels(videoId) {
  return `<div class="camera-stage">
    <div class="camera-view"><video id="${videoId}" playsinline muted></video></div>
    <div class="camera-avatar"><div class="camera-figure"></div></div>
  </div>`;
}

/**
 * Wires up the shown parts. view is { you, avatar, notes }; onChange receives each new one.
 * Returns showExercise(exercise, colors), to change what the avatar does, and stop().
 */
export function mountStage(dialog, { view, onChange }) {
  const avatar = dialog.querySelector('.camera-avatar');
  const figureBox = dialog.querySelector('.camera-figure');
  let shown = { ...view };
  let exercise = null;
  let stopFigure = null;

  const drawAvatar = () => {
    stopFigure?.();
    stopFigure = null;
    // Not animated while hidden, which saves the laptop some work over a long workout.
    if (shown.avatar && exercise) stopFigure = mountFigure(figureBox, exercise, { keep: true });
  };

  const apply = () => {
    for (const button of dialog.querySelectorAll('[data-part]')) {
      const on = shown[button.dataset.part];
      button.setAttribute('aria-pressed', String(on));
      dialog.classList.toggle(`hide-${button.dataset.part}`, !on);
    }
    drawAvatar();
  };

  for (const button of dialog.querySelectorAll('[data-part]')) {
    button.addEventListener('click', () => {
      shown = { ...shown, [button.dataset.part]: !shown[button.dataset.part] };
      apply();
      onChange?.(shown);
    });
  }

  pausePageFigures(true); // the workout page is out of sight behind this screen
  apply();

  return {
    showExercise(next, colors) {
      exercise = next;
      avatar.style.setProperty('--band', colors.band);
      avatar.style.setProperty('--on', colors.on);
      drawAvatar();
    },
    stop() {
      stopFigure?.();
      stopFigure = null;
      pausePageFigures(false);
    },
  };
}
