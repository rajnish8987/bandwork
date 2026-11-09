// The screens of a workout in progress: warm-up and cool-down, doing a set, and resting.

import { onColor } from '../core/color.js';
import { exerciseById } from '../core/exercises.js';
import { t } from '../core/i18n.js';
import { bandName, holdRange, labelFor } from '../core/progression.js';
import { plannedReps } from '../core/session.js';
import { describeSetup, setupFields } from '../core/setup.js';
import { METHOD_NOTES } from '../core/track.js';
import { formatLoad } from '../core/units.js';
import { searchUrl, videoFor, watchUrl } from '../core/videos.js';
import { amount, esc, safeColor } from './html.js';

/** The colour the workout screen wears: the strongest band selected. */
export function fieldColors(bandIds, bands) {
  const selected = bands.filter((b) => bandIds.includes(b.id)).sort((a, b) => b.kg - a.kg);
  const band = selected.length ? safeColor(selected[0].color) : '#B9C0C9';
  return { band, on: onColor(band) };
}

export function howTo(exercise) {
  return `
    <p>${esc(t(exercise.setup))}</p>
    <ul class="cues">${exercise.cues.map((c) => `<li>${esc(t(c))}</li>`).join('')}</ul>
    <p>${esc(exercise.timed ? t('Keep breathing normally.') : t('Breathe out as you push or pull, and in as you return.'))}</p>
    ${exercise.anchor ? `<p>${esc(t('Close the door on the anchor, on the side you pull toward, and give it a firm test pull first.'))}</p>` : ''}`;
}

/** A real video. Nothing loads from YouTube until the button is tapped. */
export function videoBlock(exercise, profile) {
  const video = videoFor(exercise.id, profile);
  if (!video) return '';
  const notice = video.own
    ? t('Your own video. Needs internet. YouTube may show ads and collect data once it plays.')
    : t('From {channel} on YouTube. Needs internet. YouTube may show ads and collect data once it plays.', { channel: video.channel });
  return `<div class="video" data-exercise="${esc(exercise.id)}">
    <button type="button" class="secondary" data-action="video-play">${esc(t('Watch a real video'))}</button>
    <p class="hint">${esc(notice)}</p>
    <p class="video-status" role="status" hidden></p>
    <div class="video-links">
      <a href="${esc(watchUrl(video.id, video.at))}" target="_blank" rel="noopener">${esc(t('Open in YouTube'))}</a>
      <a href="${esc(searchUrl(exercise.name))}" target="_blank" rel="noopener">${esc(t('Find another video'))}</a>
      <button type="button" class="text-button" data-action="video-own">${esc(t('Use my own video'))}</button>
      ${video.own ? `<button type="button" class="text-button" data-action="video-reset">${esc(t('Use the suggested video'))}</button>` : ''}
    </div>
  </div>`;
}

function effortRow(draft) {
  const options = [['easy', t('Easy')], ['good', t('Good')], ['hard', t('Hard')], ['limit', t('Limit')]];
  return `<fieldset class="effort">
    <legend>${esc(t('How hard was it?'))} <small class="inline-hint">${esc(t('Optional'))}</small></legend>
    ${options.map(([value, label]) => `<button type="button" class="effort-choice" data-action="set-effort" data-value="${value}" aria-pressed="${draft.effort === value}">${esc(label)}</button>`).join('')}
  </fieldset>`;
}

function setupBox(exercise, entry) {
  const fields = setupFields(exercise);
  if (!fields.length) return '';
  const setup = entry.setup ?? {};
  return `<details class="how setup-box">
    <summary>${esc(t('Your setup'))} <span class="band-label" id="setup-label">${esc(describeSetup(setup))}</span></summary>
    <p class="hint">${esc(t('Keep this the same each time, so your sessions compare fairly.'))}</p>
    ${fields.map((f) => `<label class="select-field">${esc(f.label)}
      <select data-setup-field="${f.key}">
        <option value="">${esc(t('Not noted'))}</option>
        ${f.options.map(([value, label]) => `<option value="${esc(value)}" ${String(setup[f.key]) === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}
      </select>
    </label>`).join('')}
  </details>`;
}

/** What to aim for on this set, in words. */
export function goalText(exercise, active, step, entry) {
  const { min, max } = active.range;
  if (active.method === 'failure' && step.setIndex === entry.targetSets - 1) return t('Last set: go until you cannot do one more clean rep');
  if (exercise.timed) {
    const hold = holdRange(active.range);
    return active.scheme
      ? t('Hold for {seconds} seconds', { seconds: plannedReps(active, step) })
      : t('Hold for {min}–{max} seconds', { min: hold.min, max: hold.max });
  }
  if (active.scheme) {
    const reps = plannedReps(active, step);
    return exercise.perSide ? t('Aim for {reps} reps each side', { reps }) : t('Aim for {reps} reps', { reps });
  }
  return exercise.perSide ? t('Aim for {min}–{max} reps each side', { min, max }) : t('Aim for {min}–{max} reps', { min, max });
}

export const setOfText = (active, n, total) => (active.circuit ? t('Round {n} of {total}', { n, total }) : t('Set {n} of {total}', { n, total }));

export function setScreen({ state, step, draft, swaps, canSpeak }) {
  const { active, profile } = state;
  const entry = active.exercises[step.exIndex];
  const exercise = exerciseById(entry.exerciseId);
  const { band, on } = fieldColors(draft.bandIds, profile.bands);

  const chips = [...profile.bands].sort((a, b) => a.kg - b.kg).map((b) => `
    <button type="button" class="chip" data-action="toggle-band" data-id="${esc(b.id)}" aria-pressed="${draft.bandIds.includes(b.id)}">
      <span class="dot" style="background:${safeColor(b.color)}"></span>${esc(bandName(b.name))}
      <span class="chip-kg">${esc(formatLoad(b.kg, profile.unit))}</span>
    </button>`).join('');

  const rangeText = goalText(exercise, active, step, entry);

  return `
    <div class="work" id="work" style="--band:${band};--on:${on}">
      <section class="field">
        <header class="field-bar">
          <a class="field-link" href="#/today">${esc(t('Back'))}</a>
          <span>${esc(t('Exercise {n} of {total}', { n: step.exIndex + 1, total: active.exercises.length }))}</span>
          <button type="button" class="field-link" data-action="end-workout">${esc(t('End workout'))}</button>
        </header>
        <h1 class="field-name" tabindex="-1">${esc(t(exercise.name))}</h1>
        <div class="field-figure" data-figure="${esc(exercise.id)}"></div>
        <p class="field-note">${esc(entry.target.note)}</p>
      </section>

      <section class="controls">
        <p class="set-of">${esc(setOfText(active, step.setIndex + 1, entry.targetSets))} <span class="set-range">${esc(rangeText)}</span></p>
        ${active.method ? `<p class="hint method-note">${esc(t(METHOD_NOTES[active.method]))}</p>` : ''}

        <div class="stepper">
          <button type="button" class="step" data-action="reps-down" aria-label="${esc(t('One rep fewer'))}">−</button>
          <output class="reps" id="reps-value" aria-live="polite" aria-label="${esc(exercise.timed ? t('Seconds') : t('Reps'))}">${draft.reps}</output>
          <button type="button" class="step" data-action="reps-up" aria-label="${esc(t('One rep more'))}">+</button>
        </div>
        <p class="tempo-status" id="tempo-status" role="status" hidden></p>

        <div class="coach-row">
          <button type="button" class="coach-button" id="tempo-button" data-action="tempo-toggle">${esc(exercise.timed ? t('Count seconds for me') : t('Count reps for me'))}</button>
          <button type="button" class="coach-button" data-action="camera-open">${esc(t('Camera coach'))}</button>
          <button type="button" class="coach-button" data-action="hands-free">${esc(t('Hands-free'))}</button>
          ${canSpeak ? `<button type="button" class="coach-button" data-action="voice-toggle" aria-pressed="${profile.voice}">${esc(profile.voice ? t('Voice on') : t('Voice off'))}</button>` : ''}
        </div>

        ${exercise.bodyweight ? `<p class="hint">${esc(t('No band needed for this one.'))}</p>` : `<fieldset class="chips">
          <legend>${esc(t('Band used'))} <span id="band-label" class="band-label">${esc(labelFor(draft.bandIds, profile.bands))}</span></legend>
          ${chips}
        </fieldset>`}

        ${effortRow(draft)}

        <button type="button" class="primary" data-action="done-set">${esc(t('Log set'))}</button>

        ${setupBox(exercise, entry)}

        <details class="how" id="how-details">
          <summary>${esc(t('How to do it'))}</summary>
          ${howTo(exercise)}
          ${videoBlock(exercise, profile)}
        </details>

        <div class="minor-actions">
          ${swaps.length && !entry.sets.length ? `<button type="button" class="text-button" data-action="open-swap">${esc(t('Swap exercise'))}</button>` : ''}
          <button type="button" class="text-button" data-action="skip-exercise">${esc(t('Skip exercise'))}</button>
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
  const lastExercise = exerciseById(active.exercises.find((e) => e.sets.includes(lastSet))?.exerciseId);
  const logged = lastExercise?.bodyweight
    ? t('You logged {count}.', { count: amount(lastExercise, lastSet.reps) })
    : t('You logged {count} on {band}.', { count: amount(lastExercise, lastSet?.reps), band: lastSet?.label });
  let nextLabel = isNewExercise ? t('Next exercise') : t('Next set');
  if (active.circuit) nextLabel = t('Next round');

  return `
    <div class="rest">
      <header class="field-bar">
        <a class="field-link" href="#/today">${esc(t('Back'))}</a>
        <span>${esc(t('Rest'))}</span>
        <button type="button" class="field-link" data-action="end-workout">${esc(t('End workout'))}</button>
      </header>

      <div class="rest-main">
        <p class="rest-count" id="rest-count" role="timer" aria-label="${esc(t('Seconds of rest left'))}" tabindex="-1">${seconds}</p>
        <div class="rest-track"><div class="rest-band" id="rest-band" style="--p:${progress};background:${color}"></div></div>
        <div class="rest-actions">
          <button type="button" class="secondary" data-action="add-rest">${esc(t('Add 15 seconds'))}</button>
          <button type="button" class="secondary" data-action="skip-rest">${esc(t('Skip rest'))}</button>
        </div>
      </div>

      <div class="rest-next">
        <p class="rest-next-label">${esc(nextLabel)}</p>
        <p class="rest-next-name">${esc(t(exercise.name))}</p>
        <p>${esc(setOfText(active, step.setIndex + 1, entry.targetSets))}${lastSet ? `. ${esc(logged)}` : ''}</p>
        <button type="button" class="text-button" data-action="undo-set">${esc(t('Fix the last set'))}</button>
      </div>
    </div>`;
}

/** One timed warm-up or cool-down move. */
export function routineScreen({ kind, move, index, total, seconds, progress, bandColor }) {
  const title = kind === 'warmup' ? t('Warm-up') : t('Cool-down');
  const skip = kind === 'warmup' ? t('Skip warm-up') : t('Skip cool-down');
  return `
    <div class="routine" style="--band:${safeColor(bandColor)}">
      <header class="field-bar">
        <span>${esc(title)}</span>
        <span>${esc(t('Move {n} of {total}', { n: index + 1, total }))}</span>
        <button type="button" class="field-link" data-action="routine-skip">${esc(skip)}</button>
      </header>
      <h1 class="field-name" tabindex="-1">${esc(t(move.name))}</h1>
      <div class="routine-figure" data-routine-figure></div>
      <p class="lead">${esc(t(move.cue))}</p>
      <p class="routine-count" id="routine-count" role="timer" aria-label="${esc(t('Seconds left'))}">${seconds}</p>
      <div class="rest-track"><div class="rest-band" id="routine-band" style="--p:${progress};background:var(--band)"></div></div>
      <button type="button" class="primary" data-action="routine-next">${esc(index + 1 === total ? t('Finish') : t('Next move'))}</button>
    </div>`;
}
