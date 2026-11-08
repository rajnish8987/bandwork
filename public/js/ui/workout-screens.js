// The two screens of a workout in progress: doing a set, and resting.

import { onColor } from '../core/color.js';
import { exerciseById } from '../core/exercises.js';
import { labelFor } from '../core/progression.js';
import { esc, plural, safeColor } from './html.js';

/** The colour the workout screen wears: the strongest band selected. */
export function fieldColors(bandIds, bands) {
  const selected = bands.filter((b) => bandIds.includes(b.id)).sort((a, b) => b.kg - a.kg);
  const band = selected.length ? safeColor(selected[0].color) : '#B9C0C9';
  return { band, on: onColor(band) };
}

export function howTo(exercise) {
  return `
    <p>${esc(exercise.setup)}</p>
    <ul class="cues">${exercise.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    ${exercise.anchor ? '<p>Close the door on the anchor, on the side you pull toward, and give it a firm test pull first.</p>' : ''}`;
}

export function setScreen({ state, step, draft, swaps }) {
  const { active, profile } = state;
  const entry = active.exercises[step.exIndex];
  const exercise = exerciseById(entry.exerciseId);
  const { band, on } = fieldColors(draft.bandIds, profile.bands);
  const { min, max } = active.range;

  const chips = [...profile.bands].sort((a, b) => a.kg - b.kg).map((b) => `
    <button type="button" class="chip" data-action="toggle-band" data-id="${esc(b.id)}" aria-pressed="${draft.bandIds.includes(b.id)}">
      <span class="dot" style="background:${safeColor(b.color)}"></span>${esc(b.name)}
      <span class="chip-kg">${esc(b.kg)} kg</span>
    </button>`).join('');

  return `
    <div class="work" id="work" style="--band:${band};--on:${on}">
      <section class="field">
        <header class="field-bar">
          <a class="field-link" href="#/today">Back</a>
          <span>Exercise ${step.exIndex + 1} of ${active.exercises.length}</span>
          <button type="button" class="field-link" data-action="end-workout">End workout</button>
        </header>
        <h1 class="field-name" tabindex="-1">${esc(exercise.name)}</h1>
        <div class="field-figure" data-figure="${esc(exercise.id)}"></div>
        <p class="field-note">${esc(entry.target.note)}</p>
      </section>

      <section class="controls">
        <p class="set-of">Set ${step.setIndex + 1} of ${entry.targetSets} <span class="set-range">Aim for ${min}–${max} reps${exercise.perSide ? ' each side' : ''}</span></p>

        <div class="stepper">
          <button type="button" class="step" data-action="reps-down" aria-label="One rep fewer">−</button>
          <output class="reps" id="reps-value" aria-live="polite" aria-label="Reps">${draft.reps}</output>
          <button type="button" class="step" data-action="reps-up" aria-label="One rep more">+</button>
        </div>

        <fieldset class="chips">
          <legend>Band used <span id="band-label" class="band-label">${esc(labelFor(draft.bandIds, profile.bands))}</span></legend>
          ${chips}
        </fieldset>

        <button type="button" class="primary" data-action="done-set">Log set</button>

        <details class="how">
          <summary>How to do it</summary>
          ${howTo(exercise)}
        </details>

        <div class="minor-actions">
          ${swaps.length && !entry.sets.length ? '<button type="button" class="text-button" data-action="open-swap">Swap exercise</button>' : ''}
          <button type="button" class="text-button" data-action="skip-exercise">Skip exercise</button>
        </div>
      </section>
    </div>`;
}

export function restScreen({ state, step, lastSet, seconds, progress }) {
  const { active } = state;
  const entry = active.exercises[step.exIndex];
  const exercise = exerciseById(entry.exerciseId);
  const color = safeColor(lastSet?.colors?.at(-1), '#B9C0C9');
  const isNewExercise = step.setIndex === 0;

  return `
    <div class="rest">
      <header class="field-bar">
        <a class="field-link" href="#/today">Back</a>
        <span>Rest</span>
        <button type="button" class="field-link" data-action="end-workout">End workout</button>
      </header>

      <div class="rest-main">
        <p class="rest-count" id="rest-count" role="timer" aria-label="Seconds of rest left" tabindex="-1">${seconds}</p>
        <div class="rest-track"><div class="rest-band" id="rest-band" style="--p:${progress};background:${color}"></div></div>
        <div class="rest-actions">
          <button type="button" class="secondary" data-action="add-rest">Add 15 seconds</button>
          <button type="button" class="secondary" data-action="skip-rest">Skip rest</button>
        </div>
      </div>

      <div class="rest-next">
        <p class="rest-next-label">${isNewExercise ? 'Next exercise' : 'Next set'}</p>
        <p class="rest-next-name">${esc(exercise.name)}</p>
        <p>Set ${step.setIndex + 1} of ${entry.targetSets}${lastSet ? `. You logged ${plural(lastSet.reps, 'rep')} on ${esc(lastSet.label)}.` : ''}</p>
        <button type="button" class="text-button" data-action="undo-set">Fix the last set</button>
      </div>
    </div>`;
}
