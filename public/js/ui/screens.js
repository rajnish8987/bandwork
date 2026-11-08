// Screens outside a workout. Each function returns an HTML string; app.js wires
// up the actions named in data-action and data-field attributes.

import { BAND_COLORS } from '../core/color.js';
import { EXERCISES, exerciseById, isAvailable } from '../core/exercises.js';
import { estimateMinutes, repRange } from '../core/plan.js';
import { labelFor, prescribe } from '../core/progression.js';
import { exerciseSeries, loggedExerciseIds, sessionsThisWeek, weeklyCounts, workoutSummary } from '../core/stats.js';
import { bandFill, esc, longDate, plural, safeColor, shortDate } from './html.js';
import { howTo } from './workout-screens.js';

const GROUPS = [
  ['Legs and glutes', ['squat', 'hinge', 'glute', 'calf']],
  ['Push', ['hpush', 'vpush', 'shoulder', 'triceps']],
  ['Pull', ['hpull', 'vpull', 'rear', 'biceps']],
  ['Core', ['core']],
];

const GOALS = [
  ['strength', 'Get stronger', '6–10 reps, longer rest'],
  ['muscle', 'Build muscle', '8–15 reps'],
  ['endurance', 'Build endurance', '15–25 reps, short rest'],
];

export function nav(route) {
  const tabs = [['today', 'Today'], ['progress', 'Progress'], ['exercises', 'Exercises'], ['settings', 'Settings']];
  return `<nav class="tabs" aria-label="Main">
    ${tabs.map(([id, label]) => `<a href="#/${id}" ${route === id ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
  </nav>`;
}

function choiceGroup(field, legend, options, current) {
  return `<fieldset class="choices">
    <legend>${esc(legend)}</legend>
    ${options.map(([value, label, hint]) => `
      <label class="choice">
        <input type="radio" name="${field}" data-field="${field}" value="${value}" ${String(current) === String(value) ? 'checked' : ''}>
        <span class="choice-body"><strong>${esc(label)}</strong>${hint ? `<small>${esc(hint)}</small>` : ''}</span>
      </label>`).join('')}
  </fieldset>`;
}

function toggle(field, label, hint, checked) {
  return `<label class="toggle">
    <input type="checkbox" data-field="${field}" ${checked ? 'checked' : ''}>
    <span><strong>${esc(label)}</strong>${hint ? `<small>${esc(hint)}</small>` : ''}</span>
  </label>`;
}

function bandEditor(profile) {
  const rows = profile.bands.map((b) => `
    <li class="band-row">
      <span class="dot big" style="background:${safeColor(b.color)}"></span>
      <label class="band-field grow">Name
        <input type="text" id="band-name-${esc(b.id)}" data-band-field="name" data-id="${esc(b.id)}" value="${esc(b.name)}" maxlength="24">
      </label>
      <label class="band-field">Colour
        <select id="band-color-${esc(b.id)}" data-band-field="color" data-id="${esc(b.id)}">
          ${BAND_COLORS.map((c) => `<option value="${c.hex}" ${c.hex === b.color ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </label>
      <label class="band-field narrow">kg
        <input type="number" id="band-kg-${esc(b.id)}" inputmode="decimal" min="0.5" max="200" step="0.5" data-band-field="kg" data-id="${esc(b.id)}" value="${esc(b.kg)}">
      </label>
      <button type="button" class="text-button" data-action="remove-band" data-id="${esc(b.id)}" ${profile.bands.length === 1 ? 'disabled' : ''} aria-label="Remove ${esc(b.name)}">Remove</button>
    </li>`).join('');
  return `
    <ul class="band-list">${rows}</ul>
    <button type="button" class="secondary" data-action="add-band">Add a band</button>`;
}

function planChoices(profile) {
  return `
    ${choiceGroup('goal', 'What is your goal?', GOALS, profile.goal)}
    ${choiceGroup('daysPerWeek', 'How many days a week?', [[2, '2 days'], [3, '3 days'], [4, '4 days']], profile.daysPerWeek)}
    ${choiceGroup('minutes', 'How long is a session?', [[20, '20 min'], [30, '30 min'], [45, '45 min']], profile.minutes)}`;
}

function equipmentChoices(profile) {
  return `<fieldset class="toggles">
    <legend>What else do you have?</legend>
    ${toggle('hasAnchor', 'Door anchor', 'Adds pulldowns, pressdowns and rotation work', profile.hasAnchor)}
    ${toggle('hasMini', 'Mini loop band', 'Adds lateral walks for your glutes', profile.hasMini)}
  </fieldset>`;
}

function formMessage(message) {
  return `<p id="form-message" class="message ${message?.kind ?? ''}" role="status" ${message ? '' : 'hidden'}>${esc(message?.text ?? '')}</p>`;
}

export function setupScreen({ state, message }) {
  const { profile } = state;
  return `<main class="page setup">
    <h1 class="display" tabindex="-1">Set up your bands</h1>
    <p class="lead">Your plan is built from the bands you own. All of it stays on this device.</p>
    <section>
      <h2>Your bands</h2>
      <p class="hint">Use the tension printed on the band. A rough figure is fine: it ranks your bands and decides when to move up.</p>
      ${bandEditor(profile)}
    </section>
    <section>${equipmentChoices(profile)}</section>
    <section>${planChoices(profile)}</section>
    ${formMessage(message)}
    <button type="button" class="primary" data-action="finish-setup">Build my plan</button>
  </main>`;
}

function weekMeter(done, target) {
  const cells = Array.from({ length: Math.max(target, done) }, (_, i) => `<span class="${i < done ? 'on' : ''}"></span>`).join('');
  return `<div class="week">
    <div class="week-cells" aria-hidden="true">${cells}</div>
    <p>${done} of ${target} workouts this week</p>
  </div>`;
}

export function todayScreen({ state, preview, now, message }) {
  const { profile, workouts, active } = state;
  const session = active ?? preview;
  const range = session.range;
  const rows = session.exercises.map((e) => {
    const ex = exerciseById(e.exerciseId);
    const colors = e.target.bandIds.map((id) => profile.bands.find((b) => b.id === id)?.color).filter(Boolean);
    const state = e.sets.length >= e.targetSets ? 'Done' : e.skipped ? 'Skipped' : e.sets.length ? `${e.sets.length} of ${e.targetSets} sets done` : null;
    return `<li>
      <a class="ladder-row" href="#/exercises/${esc(ex.id)}">
        <span class="stripe" style="background:${bandFill(colors)}"></span>
        <span class="ladder-text">
          <strong>${esc(ex.name)}</strong>
          <small>${state ? esc(state) : `${plural(e.targetSets, 'set')} of ${range.min}–${range.max}${ex.perSide ? ' each side' : ''} on ${esc(labelFor(e.target.bandIds, profile.bands))}`}</small>
        </span>
      </a>
    </li>`;
  }).join('');
  const anchorNeeded = session.exercises.some((e) => exerciseById(e.exerciseId).anchor);
  const minutes = estimateMinutes(profile, session.exercises.length);

  return `<main class="page today">
    ${message ? `<p class="message ${message.kind}" role="status">${esc(message.text)}</p>` : ''}
    <div class="today-hero">
      ${weekMeter(sessionsThisWeek(workouts, now), profile.daysPerWeek)}
      <p class="eyebrowless">${active ? 'In progress' : 'Next workout'}</p>
      <h1 class="display huge" tabindex="-1">${esc(session.name)}</h1>
      <p class="lead">${plural(session.exercises.length, 'exercise')}, about ${minutes} minutes</p>
      <a class="primary" href="#/workout" data-action="${active ? 'resume-workout' : 'start-workout'}">${active ? 'Resume workout' : 'Start workout'}</a>
      <p class="hint safety">Check your bands for nicks or cracks first, and replace a damaged band.${anchorNeeded ? ' Test the door anchor with a firm pull.' : ''} Stop if anything hurts.</p>
    </div>
    <ol class="ladder">${rows}</ol>
  </main>`;
}

function weeksChart(workouts, target, now) {
  const weeks = weeklyCounts(workouts, 12, now);
  const hit = weeks.filter((w) => w.count >= target).length;
  const peak = Math.max(target, ...weeks.map((w) => w.count));
  const columns = weeks.map((w) => `
    <div class="week-col" title="Week of ${esc(shortDate(w.start))}: ${plural(w.count, 'workout')}">
      ${Array.from({ length: peak }, (_, i) => `<span class="${i < w.count ? 'on' : ''}"></span>`).reverse().join('')}
    </div>`).join('');
  return `<section>
    <h2>Last 12 weeks</h2>
    <div class="weeks" role="img" aria-label="Workouts per week. You reached your target of ${target} in ${hit} of the last 12 weeks.">${columns}</div>
    <p class="hint">Reached your target of ${target} a week in ${hit} of 12 weeks.</p>
  </section>`;
}

// Names each stretch of bars by band, so the chart does not rely on colour alone.
function bandRuns(points) {
  const runs = [];
  for (const p of points) {
    if (runs.at(-1)?.label === p.label) runs.at(-1).count += 1;
    else runs.push({ label: p.label, count: 1 });
  }
  return runs;
}

function exerciseChart(series, range, selected) {
  const recent = series.slice(-12);
  const top = Math.max(range.max, ...recent.map((p) => p.reps));
  const point = recent[selected] ?? recent.at(-1);
  const bandChanged = (i) => i === 0 || recent[i].label !== recent[i - 1].label;
  const bars = recent.map((p, i) => {
    const show = bandChanged(i) || i === recent.length - 1;
    return `<button type="button" class="bar" data-action="chart-point" data-i="${i}" style="--h:${(p.reps / top) * 100}%;--fill:${bandFill(p.colors)}" aria-label="${esc(shortDate(p.at))}: ${plural(p.reps, 'rep')} on ${esc(p.label)}" ${i === (selected ?? recent.length - 1) ? 'aria-pressed="true"' : 'aria-pressed="false"'}>
      <span class="bar-fill">${show ? `<span class="bar-label">${p.reps}</span>` : ''}</span>
    </button>`;
  }).join('');
  const seen = new Map();
  for (const p of recent) if (!seen.has(p.label)) seen.set(p.label, p.colors);
  const legend = seen.size > 1
    ? `<ul class="legend">${[...seen].map(([label, colors]) => `<li><span class="dot" style="background:${bandFill(colors)}"></span>${esc(label)}</li>`).join('')}</ul>`
    : '';

  return `
    <div class="chart">
      <div class="chart-guide" style="bottom:${(range.max / top) * 100}%"><span>${range.max}</span></div>
      <div class="chart-guide" style="bottom:${(range.min / top) * 100}%"><span>${range.min}</span></div>
      <div class="bars">${bars}</div>
    </div>
    <div class="band-runs" aria-hidden="true">${bandRuns(recent).map((run) => `<span style="flex-grow:${run.count}">${esc(run.label)}</span>`).join('')}</div>
    <div class="chart-axis"><span>${esc(shortDate(recent[0].at))}</span><span>${esc(shortDate(recent.at(-1).at))}</span></div>
    ${legend}
    <p class="readout" role="status">${esc(longDate(point.at))}: best set ${plural(point.reps, 'rep')} on ${esc(point.label)} (${esc(point.kg)} kg)</p>
    <p class="hint">Bars show the best set of each session, in the colour of the band. Lines mark your rep range. Reach the top line on every set and the next session moves you to a stronger band.</p>
    <details class="how">
      <summary>Show as a table</summary>
      <table>
        <thead><tr><th scope="col">Date</th><th scope="col">Best reps</th><th scope="col">Band</th><th scope="col">kg</th></tr></thead>
        <tbody>${[...series].reverse().map((p) => `<tr><td>${esc(shortDate(p.at))}</td><td>${p.reps}</td><td>${esc(p.label)}</td><td>${esc(p.kg)}</td></tr>`).join('')}</tbody>
      </table>
    </details>`;
}

export function progressScreen({ state, now, chartExercise, chartPoint }) {
  const { workouts, profile } = state;
  if (!workouts.length) {
    return `<main class="page">
      <h1 class="display" tabindex="-1">Progress</h1>
      <p class="lead">Your first workout starts the record. Each exercise then gets its own chart.</p>
      <a class="primary" href="#/today">Go to today's workout</a>
    </main>`;
  }
  const ids = loggedExerciseIds(workouts);
  const current = ids.includes(chartExercise) ? chartExercise : ids[0];
  const name = (id) => exerciseById(id)?.name ?? id;
  const series = exerciseSeries(workouts, current);
  const history = [...workouts].reverse().slice(0, 30).map((w) => {
    const s = workoutSummary(w);
    return `<li class="history-row">
      <div><strong>${esc(w.name)}</strong><small>${esc(longDate(w.finishedAt))}. ${plural(s.sets, 'set')}, ${plural(s.reps, 'rep')}, ${plural(s.minutes, 'minute')}</small></div>
      <button type="button" class="text-button" data-action="delete-workout" data-id="${esc(w.id)}" aria-label="Delete ${esc(w.name)} from ${esc(longDate(w.finishedAt))}">Delete</button>
    </li>`;
  }).join('');

  return `<main class="page progress">
    <h1 class="display" tabindex="-1">Progress</h1>
    ${weeksChart(workouts, profile.daysPerWeek, now)}
    <section>
      <h2>By exercise</h2>
      <label class="select-field">Exercise
        <select id="chart-exercise" data-field-ui="chartExercise">
          ${ids.map((id) => `<option value="${esc(id)}" ${id === current ? 'selected' : ''}>${esc(name(id))}</option>`).join('')}
        </select>
      </label>
      ${exerciseChart(series, repRange(profile.goal), chartPoint)}
    </section>
    <section>
      <h2>Workouts</h2>
      <ul class="history">${history}</ul>
    </section>
  </main>`;
}

export function libraryScreen({ state, query }) {
  const { profile } = state;
  const q = query.trim().toLowerCase();
  const match = (e) => !q || `${e.name} ${e.muscles}`.toLowerCase().includes(q);
  const sections = GROUPS.map(([title, patterns]) => {
    const list = EXERCISES.filter((e) => patterns.includes(e.pattern) && match(e));
    if (!list.length) return '';
    return `<section>
      <h2>${esc(title)}</h2>
      <ul class="library">${list.map((e) => `<li>
        <a class="library-row" href="#/exercises/${esc(e.id)}">
          <strong>${esc(e.name)}</strong>
          <small>${esc(e.muscles)}${isAvailable(e, profile) ? '' : `. Needs ${e.anchor ? 'a door anchor' : 'a mini loop'}`}</small>
        </a>
      </li>`).join('')}</ul>
    </section>`;
  }).join('');
  return `<main class="page">
    <h1 class="display" tabindex="-1">Exercises</h1>
    <label class="select-field">Find an exercise or muscle
      <input type="search" id="library-search" data-field-ui="query" value="${esc(query)}" autocomplete="off">
    </label>
    ${sections || `<p class="lead">Nothing matches "${esc(query)}". Try a muscle, such as back or glutes.</p>`}
  </main>`;
}

export function exerciseScreen({ state, id }) {
  const e = exerciseById(id);
  const band = state.profile.bands[Math.min(1, state.profile.bands.length - 1)];
  const needs = e.anchor ? 'door anchor' : e.mini ? 'mini loop' : null;
  return `<main class="page exercise" style="--band:${safeColor(band?.color)}">
    <a class="back" href="#/exercises" data-action="go-back">Back</a>
    <h1 class="display" tabindex="-1">${esc(e.name)}</h1>
    <p class="lead">${esc(e.muscles)}${needs ? `. Needs a ${needs}` : ''}${e.perSide ? '. Done on each side' : ''}.</p>
    <div class="exercise-figure" data-figure="${esc(e.id)}"></div>
    <section class="how-open">
      <h2>How to do it</h2>
      ${howTo(e)}
    </section>
  </main>`;
}

export function summaryScreen({ state, workout, now }) {
  const { profile, workouts } = state;
  const s = workoutSummary(workout);
  const range = repRange(profile.goal);
  const upToThis = workouts.filter((w) => w.finishedAt <= workout.finishedAt);
  const rows = workout.exercises.map((entry) => {
    const ex = exerciseById(entry.exerciseId);
    const history = upToThis.flatMap((w) => w.exercises.filter((x) => x.exerciseId === entry.exerciseId && x.sets.length));
    const next = ex ? prescribe(ex, history, profile.bands, range) : null;
    const reps = entry.sets.map((set) => set.reps).join(', ');
    const last = entry.sets.at(-1);
    return `<li class="summary-row">
      <span class="stripe" style="background:${bandFill(last.colors)}"></span>
      <div>
        <strong>${esc(ex?.name ?? entry.exerciseId)}</strong>
        <small>${esc(last.label)}: ${esc(reps)} reps</small>
        ${next ? `<small class="next-time">Next time: ${esc(next.note)}</small>` : ''}
      </div>
    </li>`;
  }).join('');
  return `<main class="page summary">
    <h1 class="display huge" tabindex="-1">Workout logged</h1>
    <p class="lead">${esc(workout.name)}: ${plural(s.sets, 'set')}, ${plural(s.reps, 'rep')}, ${plural(s.minutes, 'minute')}.</p>
    ${weekMeter(sessionsThisWeek(workouts, now), profile.daysPerWeek)}
    <ul class="summary-list">${rows}</ul>
    <a class="primary" href="#/today">Back to today</a>
  </main>`;
}

export function settingsScreen({ state, message, canInstall, secure }) {
  const { profile, workouts } = state;
  return `<main class="page settings">
    <h1 class="display" tabindex="-1">Settings</h1>
    ${formMessage(message)}
    <section>
      <h2>Your bands</h2>
      ${bandEditor(profile)}
    </section>
    <section>${equipmentChoices(profile)}</section>
    <section>
      <h2>Your plan</h2>
      ${planChoices(profile)}
      <p class="hint">Changes apply from your next workout. Your history stays.</p>
    </section>
    <section>
      <h2>Rest timer</h2>
      <div class="toggles">
        ${toggle('sound', 'Play a sound when rest ends', '', profile.sound)}
        ${toggle('vibrate', 'Vibrate when rest ends', 'Android phones only', profile.vibrate)}
      </div>
    </section>
    <section>
      <h2>App</h2>
      ${canInstall ? '<button type="button" class="secondary" data-action="install">Install Bandwork</button>' : ''}
      ${secure ? '<p class="hint">Bandwork is ready to work with no connection.</p>' : '<p class="hint">This address needs a connection to your laptop, because offline use needs a secure address. See the README to set up the installable version.</p>'}
    </section>
    <section>
      <h2>Your data</h2>
      <p class="hint">Your laptop and phone keep separate records. Save a backup on one and restore it on the other to move your data. You have ${plural(workouts.length, 'workout')} logged here.</p>
      <div class="button-row">
        <button type="button" class="secondary" data-action="export">Save a backup</button>
        <label class="secondary file-button">Restore a backup
          <input type="file" id="import-file" accept="application/json,.json" data-action-change="import">
        </label>
      </div>
      <button type="button" class="text-button danger" data-action="reset">Erase everything on this device</button>
    </section>
  </main>`;
}
