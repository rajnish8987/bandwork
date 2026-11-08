// How the band was set up for an exercise. Stance, grip and distance from the
// door all change the pull, so sessions only compare fairly if they match.

import { t } from './i18n.js';

const MAX_STEPS = 12;

function touches(exercise, prefix) {
  return (exercise.band ?? []).flat().some((end) => end.startsWith(prefix));
}

export function setupFields(exercise) {
  const fields = [];
  if (touches(exercise, 'foot')) {
    fields.push({
      key: 'stance',
      label: t('Stance'),
      options: [['narrow', t('Narrow')], ['hip', t('Hip-width')], ['wide', t('Wide')]],
    });
  }
  if (touches(exercise, 'door')) {
    fields.push({
      key: 'steps',
      label: t('Steps from the door'),
      options: Array.from({ length: MAX_STEPS + 1 }, (_, i) => [String(i), String(i)]),
    });
  }
  if (touches(exercise, 'hand')) {
    fields.push({
      key: 'grip',
      label: t('Grip on the band'),
      options: [['full', t('Full length')], ['short', t('Shortened')]],
    });
  }
  return fields;
}

const STANCE = { narrow: () => t('narrow stance'), hip: () => t('hip-width stance'), wide: () => t('wide stance') };
const GRIP = { full: () => t('full grip'), short: () => t('short grip') };

/** One line of plain words for a saved setup; empty when nothing was noted. */
export function describeSetup(setup) {
  if (!setup) return '';
  const parts = [];
  if (STANCE[setup.stance]) parts.push(STANCE[setup.stance]());
  if (setup.steps !== undefined && setup.steps !== '') parts.push(t('{n} steps from the door', { n: setup.steps }));
  if (GRIP[setup.grip]) parts.push(GRIP[setup.grip]());
  const text = parts.join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
