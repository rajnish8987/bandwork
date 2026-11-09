// Screens reached from Settings: band care, programs and the workout builder.

import { bandHealth } from '../core/bandcare.js';
import { EXERCISES, exerciseById } from '../core/exercises.js';
import { t } from '../core/i18n.js';
import { allBuiltIn, customChoices } from '../core/plan.js';
import { PROGRAMS, programStatus, programWeeks } from '../core/programs.js';
import { bandName } from '../core/progression.js';
import { scheduleWarnings } from '../core/schedule.js';
import { formatLoad } from '../core/units.js';
import { dayName, esc, plural, safeColor, shortDate } from './html.js';
import { autoProgram, SHORT_TERM_WEEKS } from '../core/autoplan.js';
import { TRACK, TRACK_ID } from '../core/track.js';

function backLink(href, label) {
  return `<a class="back" href="${href}">${esc(label)}</a>`;
}

function formMessage(message) {
  return `<p id="form-message" class="message ${message?.kind ?? ''}" role="status" ${message ? '' : 'hidden'}>${esc(message?.text ?? '')}</p>`;
}

/* ---------- Band care ---------- */

const STATUS_TEXT = {
  ok: () => t('No action needed'),
  inspect: () => t('Safety check due'),
  replace: () => t('Think about replacing it'),
};

export function bandsScreen({ state, now, message }) {
  const { profile, workouts } = state;
  const rows = profile.bands.map((band) => {
    const h = bandHealth(band, workouts, now);
    return `<li class="band-card">
      <div class="band-card-title"><span class="dot big" style="background:${safeColor(band.color)}"></span><strong>${esc(bandName(band.name))}</strong> <span>${esc(formatLoad(band.kg, profile.unit))}</span></div>
      <p class="band-status ${h.status === 'ok' ? '' : 'attention'}">${esc(STATUS_TEXT[h.status]())}</p>
      <p class="hint">${esc(t('{age} old. {sets} since the last check.', { age: plural(h.ageDays, 'day'), sets: plural(h.setsSinceCheck, 'set') }))}</p>
      <p class="hint">${esc(band.measuredAt
    ? t('Measured on {date}.', { date: shortDate(band.measuredAt) })
    : t('Not measured yet. This figure is from the label or your estimate.'))}</p>
      <div class="button-row">
        <a class="secondary small" href="#/bands/${esc(band.id)}">${esc(t('Measure tension'))}</a>
        <button type="button" class="secondary small" data-action="band-checked" data-id="${esc(band.id)}">${esc(t('Checked, no damage'))}</button>
        <button type="button" class="text-button" data-action="band-replaced" data-id="${esc(band.id)}">${esc(t('I replaced this band'))}</button>
      </div>
    </li>`;
  }).join('');
  return `<main class="page">
    ${backLink('#/settings', t('Settings'))}
    <h1 class="display" tabindex="-1">${esc(t('Your bands'))}</h1>
    ${formMessage(message)}
    <section>
      <h2>${esc(t('How to check a band'))}</h2>
      <p>${esc(t('Slide the whole band through your fingers while it is slightly stretched. Replace it if you find a nick, tear, crack, sticky or chalky patch, or if it stays longer after stretching. A worn band can snap.'))}</p>
      <p class="hint">${esc(t('Reminders are a rule of thumb: every 30 days or 150 sets, and replacing after a year or 1,500 sets. Follow your band maker if they say otherwise.'))}</p>
    </section>
    <ul class="band-cards">${rows}</ul>
  </main>`;
}

export function measureScreen({ state, band, message }) {
  const { unit } = state.profile;
  const input = (i) => `<label class="band-field">${esc(t('Reading {n}', { n: i }))} (${esc(unit)})
    <input type="number" inputmode="decimal" min="0" max="400" step="0.1" id="reading-${i}" data-reading>
  </label>`;
  return `<main class="page measure">
    ${backLink('#/bands', t('Your bands'))}
    <h1 class="display" tabindex="-1">${esc(t('Measure {band}', { band: bandName(band.name) }))}</h1>
    <p class="lead">${esc(t('A cheap luggage scale tells you what this band really pulls at your working stretch. Labels are often a long way off.'))}</p>
    ${formMessage(message)}
    <section>
      <h2>${esc(t('Steps'))}</h2>
      <ol class="steps">
        <li>${esc(t('Fix one end of the band to something solid, such as a door anchor in a closed door.'))}</li>
        <li>${esc(t('Hook the luggage scale to the free end.'))}</li>
        <li>${esc(t('Pull the scale back to where your hands finish in a typical exercise.'))}</li>
        <li>${esc(t('Hold it steady, read the scale and let the band back slowly.'))}</li>
        <li>${esc(t('Do this up to three times and enter each reading.'))}</li>
      </ol>
      <p class="notice">${esc(t('Check the band for damage first, and keep it and the scale away from your face in case something slips.'))}</p>
    </section>
    <section>
      <div class="readings">${input(1)}${input(2)}${input(3)}</div>
      <button type="button" class="primary save-readings" data-action="measure-save" data-id="${esc(band.id)}">${esc(t('Save the measurement'))}</button>
      <p class="hint">${esc(t('Old workouts keep the figure they were logged with. Keep your setup the same, because tension changes with how far you stretch.'))}</p>
    </section>
  </main>`;
}

/* ---------- Programs ---------- */

function planPhases(phases, startedAt, firstWeek) {
  let week = firstWeek;
  return `<ol class="plan-phases">${phases.map((phase) => {
    const from = week;
    const to = week + phase.weeks - 1;
    week = to + 1;
    const when = from === to ? t('Week {week}', { week: from }) : t('Weeks {from} to {to}', { from, to });
    const date = startedAt ? ` <small>${esc(shortDate(startedAt + (from - 1) * 7 * 86400000))}</small>` : '';
    return `<li class="${phase.lighter ? 'phase-lighter' : ''}"><strong>${esc(t(phase.name))}</strong> <span>${esc(when)}</span>${date}</li>`;
  }).join('')}</ol>`;
}

function yourPlan(profile, status) {
  const plan = autoProgram(profile);
  const running = status?.program.id === 'auto' && !status.finished;
  const startedAt = running ? profile.program.startedAt : null;
  const longTerm = plan.phases.filter((p) => p.term === 'long');
  return `<section class="band-card your-plan">
    <h2>${esc(t(plan.name))}</h2>
    <p>${esc(t(plan.summary))}</p>
    ${running ? `<p class="band-status attention">${esc(t('Week {week} of {total}', { week: status.week, total: status.totalWeeks }))}: ${esc(t(status.phase.name))}</p>` : ''}
    <h3>${esc(t('Short term: your first {weeks} weeks', { weeks: SHORT_TERM_WEEKS }))}</h3>
    ${planPhases(plan.phases.filter((p) => p.term === 'short'), startedAt, 1)}
    <h3>${esc(t('Long term: the next {weeks} weeks', { weeks: longTerm.reduce((n, p) => n + p.weeks, 0) }))}</h3>
    ${planPhases(longTerm, startedAt, SHORT_TERM_WEEKS + 1)}
    ${running
    ? `<button type="button" class="secondary small" data-action="program-stop">${esc(t('Stop this program'))}</button>`
    : `<button type="button" class="primary" data-action="program-start" data-id="auto">${esc(t('Start my plan'))}</button>`}
  </section>`;
}

function trackCard(status) {
  const running = status?.program.id === TRACK_ID && !status.finished;
  return `<section class="band-card">
    <h2>${esc(t(TRACK.name))}</h2>
    <p>${esc(t(TRACK.summary))}</p>
    ${running ? `<p class="band-status attention">${esc(t('Week {week} of {total}', { week: status.week, total: status.totalWeeks }))}: ${esc(t(status.phase.name))}</p>
    <button type="button" class="secondary small" data-action="program-stop">${esc(t('Stop this program'))}</button>` : ''}
    <a class="secondary small" href="#/specials">${esc(t('Choose a level in Specials'))}</a>
    <p class="hint">${esc(t('While it runs, it decides your days in place of your weekly schedule.'))}</p>
  </section>`;
}

export function programsScreen({ state, now }) {
  const { profile } = state;
  const status = programStatus(profile, now);
  const cards = PROGRAMS.map((p) => {
    const running = status?.program.id === p.id && !status.finished;
    return `<li class="band-card">
      <h2>${esc(t(p.name))}</h2>
      <p>${esc(t(p.summary))}</p>
      <ul class="phases">${p.phases.map((ph) => `<li>${esc(t(ph.name))}: ${esc(plural(ph.weeks, 'week'))}</li>`).join('')}</ul>
      <p class="hint">${esc(t('{weeks} in total', { weeks: plural(programWeeks(p), 'week') }))}</p>
      ${running
    ? `<p class="band-status attention">${esc(t('Week {week} of {total}', { week: status.week, total: status.totalWeeks }))}</p>
       <button type="button" class="secondary small" data-action="program-stop">${esc(t('Stop this program'))}</button>`
    : `<button type="button" class="secondary small" data-action="program-start" data-id="${esc(p.id)}" aria-label="${esc(t('Start {name}', { name: t(p.name) }))}">${esc(t('Start'))}</button>`}
    </li>`;
  }).join('');
  return `<main class="page">
    ${backLink('#/settings', t('Settings'))}
    <h1 class="display" tabindex="-1">${esc(t('Programs'))}</h1>
    <p class="lead">${esc(t('A program sets your rep range, sets and lighter weeks for you, on the plan and days you already chose.'))}</p>
    ${yourPlan(profile, status)}
    ${trackCard(status)}
    <h2 class="other-programs">${esc(t('Other programs'))}</h2>
    <ul class="band-cards">${cards}</ul>
  </main>`;
}

/* ---------- Guide ---------- */

const picture = (name, title) => (name.endsWith('.gif')
  ? `<picture>
      <source media="(prefers-reduced-motion: reduce)" srcset="guide/${name.replace('.gif', '.jpg')}">
      <img class="guide-picture" src="guide/${name}" alt="${esc(title)}" width="360" height="640" loading="lazy">
    </picture>`
  : `<img class="guide-picture" src="guide/${name}" alt="${esc(title)}" width="360" height="640" loading="lazy">`);

/** The steps of the guide. Pictures are made by tools/make-guide.mjs. */
export const GUIDE_PICTURES = [
  'setup.jpg', 'start-workout.gif', 'start-workout.jpg', 'log-set.gif', 'log-set.jpg', 'count-reps.gif', 'count-reps.jpg',
  'camera.gif', 'camera.jpg', 'hands-free.jpg', 'video.jpg', 'specials.jpg', 'schedule.jpg', 'measure.jpg', 'progress.jpg', 'programs.jpg', 'settings.jpg',
];

/** The four kinds of help side by side. On a phone each row becomes a card. */
function helpTable() {
  const headings = [t('Use it when'), t('Camera'), t('Counts'), t('Corrects form'), t('Logs your set'), t('Lasts')];
  const rows = [
    [t('Count reps for me'), t('You want a steady pace with no camera'), t('No'), t('A timed count, not your real reps'), t('No'), t('No. It fills in your planned reps, then you tap Log set'), t('One set')],
    [t('Camera coach'), t('You want to check one set, or learn a move'), t('Yes'), t('Your real reps'), t('Yes'), t('No. Tap Use this count, then Log set'), t('One set')],
    [t('Hands-free'), t('You want to train without touching the screen'), t('Yes'), t('Your real reps'), t('Yes'), t('Yes, then it runs your rest and moves on'), t('The whole workout')],
    [t('Voice'), t('You want to hear each set and rep count'), t('No'), t('Nothing. It only speaks'), t('No'), t('No'), t('Until you turn it off')],
  ];
  return `<table class="help-table">
    <thead><tr><td></td>${headings.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(([name, ...cells]) => `<tr><th scope="row">${esc(name)}</th>${cells.map((cell, i) => `<td data-label="${esc(headings[i])}">${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

export function guideScreen() {
  const steps = [
    { title: t('Set up your bands'), text: t('Choose your level to see which band to start with. Check each band and its tension, then choose your goal and how long you can train. Tap Build my plan. You can change all of it later in Settings.'), image: 'setup.jpg' },
    { title: t('Start a workout'), text: t('Today shows your next workout. Tap Start workout. A short warm-up runs first, or tap Skip warm-up.'), image: 'start-workout.gif' },
    { title: t('Log each set'), text: t('Set your reps with the plus and minus buttons, tap the band you used, and choose how hard it felt. Tap Log set and the rest timer starts on its own.'), image: 'log-set.gif' },
    {
      title: t('Which one do I use?'),
      text: t('Every set shows the same three kinds of help, and Voice can go with any of them. On a laptop, Hands-free is the easiest way through a whole workout.'),
      table: helpTable(),
      note: t('Camera coach and Hands-free say corrections out loud, even with Voice off. Hands-free also says everything else. With Count reps for me and Camera coach, turn Voice on to hear the numbers. Choose the voice itself in Settings.'),
    },
    { title: t('Count reps for me'), text: t('Tap Count reps for me to hear beeps and see a count at a steady pace. Follow the beeps. It does not see you, so it counts the same however you move.'), image: 'count-reps.gif' },
    {
      title: t('Camera coach'),
      text: t('Tap Camera coach during any set, or Try Camera coach on an exercise page. Prop your phone or laptop up so your whole body is in view, then step back. You see yourself beside the avatar doing the move, so follow the avatar. The camera counts your reps and says out loud when your speed, range, evenness or leaning needs fixing.'),
      note: t('Use the You, Avatar and Form notes buttons to show or hide each part. The camera keeps counting even when your picture is hidden. This picture is an example of what you will see. Camera coach cannot see everything, such as a rounded back, and it does not replace a coach.'),
      image: 'camera.gif',
      action: `<button type="button" class="secondary" data-action="camera-practice" data-id="squat">${esc(t('Try Camera coach'))}</button>`,
    },
    { title: t('Hands-free'), text: t('Tap Hands-free on any set and the camera stays on for the whole workout. It counts your reps, logs each set, runs your rest and moves on. Raise both hands and hold to move on early.'), note: t('You can show or hide yourself and the avatar here too. To change a band or anything else, leave Hands-free first.'), image: 'hands-free.jpg' },
    { title: t('Watch a real video'), text: t('Open any exercise, or How to do it during a set, and tap Watch a real video. If you do not like it, find another or use your own.'), image: 'video.jpg', link: ['#/exercises', t('Exercises')] },
    { title: t('Specials and the 12 week track'), text: t('Open Specials for videos with jump points, sorted by level, and the know-how behind them. Tap Follow this level and Today then sets every workout, day and rep for you.'), image: 'specials.jpg', link: ['#/specials', t('Specials')] },
    { title: t('Choose a workout for each day'), text: t('Pick a workout or a rest day for all seven days. Today then follows your choices.'), image: 'schedule.jpg', link: ['#/schedule', t('Weekly schedule')] },
    { title: t('Measure and check your bands'), text: t('A luggage scale shows what each band really pulls. The app also tracks each band and reminds you to check it for damage.'), image: 'measure.jpg', link: ['#/bands', t('Your bands')] },
    { title: t('See your progress'), text: t('Check your streak, sets per muscle, balance warnings, records and a chart for each exercise.'), image: 'progress.jpg', link: ['#/progress', t('Progress')] },
    { title: t('Your short and long term plan'), text: t('Your answers build a 4 week plan and a 24 week plan, with lighter weeks built in. You can also follow another program, or pick your own exercises and save them as a workout.'), image: 'programs.jpg', link: ['#/programs', t('Programs')] },
    { title: t('Reminders and backups'), text: t('In Settings, choose the days and time for reminders. Save a backup now and then, because your data stays only on this device.'), image: 'settings.jpg', link: ['#/settings', t('Settings')] },
  ];
  return `<main class="page guide">
    <h1 class="display" tabindex="-1">${esc(t('Guide'))}</h1>
    <p class="lead">${esc(t('How to use Tensile, step by step.'))}</p>
    <ol class="guide-steps">${steps.map((step) => `<li class="guide-step${step.table ? ' wide' : ''}">
      <div class="guide-text">
        <h2>${esc(step.title)}</h2>
        <p>${esc(step.text)}</p>
        ${step.table ?? ''}
        ${step.note ? `<p class="hint">${esc(step.note)}</p>` : ''}
        ${step.action ?? ''}
        ${step.link ? `<a class="plain-link" href="${step.link[0]}">${esc(step.link[1])}</a>` : ''}
      </div>
      ${step.image ? `<div class="guide-frame">${picture(step.image, step.title)}</div>` : ''}
    </li>`).join('')}</ol>
  </main>`;
}

/* ---------- Weekly schedule ---------- */

const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

function scheduleWarningText(warning) {
  return warning.id === 'no-rest'
    ? t('Every day is a training day. Most people need at least one rest day a week.')
    : t('{first} and {second} work the same muscles. Muscles usually need about 48 hours to recover.', { first: dayName(warning.first), second: dayName(warning.second) });
}

export function scheduleScreen({ state }) {
  const { profile } = state;
  const { enabled, days } = profile.schedule;
  const builtIn = allBuiltIn(profile);
  const own = customChoices(profile);
  const option = (template, current) => `<option value="${esc(template.id)}" ${current === template.id ? 'selected' : ''}>${esc(t(template.name))}</option>`;
  const rows = MONDAY_FIRST.map((day) => {
    const current = days[day] ?? '';
    return `<label class="select-field">${esc(dayName(day))}
      <select id="schedule-${day}" data-schedule-day="${day}" ${enabled ? '' : 'disabled'}>
        <option value="" ${current ? '' : 'selected'}>${esc(t('Rest day'))}</option>
        <optgroup label="${esc(t('Built-in workouts'))}">${builtIn.map((x) => option(x, current)).join('')}</optgroup>
        ${own.length ? `<optgroup label="${esc(t('Your workouts'))}">${own.map((x) => option(x, current)).join('')}</optgroup>` : ''}
      </select>
    </label>`;
  }).join('');
  return `<main class="page">
    ${backLink('#/settings', t('Settings'))}
    <h1 class="display" tabindex="-1">${esc(t('Weekly schedule'))}</h1>
    <p class="lead">${esc(t('Today shows the workout you choose for each day. You can still train on a rest day.'))}</p>
    <section>
      <label class="toggle">
        <input type="checkbox" id="schedule-on" data-schedule-toggle ${enabled ? 'checked' : ''}>
        <span><strong>${esc(t('Use my weekly schedule'))}</strong></span>
      </label>
      ${rows}
    </section>
    ${scheduleWarnings(profile).map((w) => `<p class="notice schedule-note">${esc(scheduleWarningText(w))}</p>`).join('')}
    <a class="plain-link" href="#/builder">${esc(t('Build your own workout'))}</a>
  </main>`;
}

/* ---------- Workout builder ---------- */

export function builderListScreen({ state }) {
  const { profile } = state;
  const list = profile.customWorkouts;
  const hasAny = list.length > 0;
  return `<main class="page">
    ${backLink('#/settings', t('Settings'))}
    <h1 class="display" tabindex="-1">${esc(t('Your workouts'))}</h1>
    <p class="lead">${esc(t('Pick your own exercises. Progress on each still tracks automatically.'))}</p>
    ${hasAny ? `<ul class="history">${list.map((w) => `<li class="history-row">
      <div><strong>${esc(w.name)}</strong><small>${esc(t('{count}, {sets} each', { count: plural(w.exerciseIds.length, 'exercise'), sets: plural(w.sets, 'set') }))}</small></div>
      <a class="secondary small" href="#/builder/${esc(w.id)}" aria-label="${esc(t('Edit {name}', { name: w.name }))}">${esc(t('Edit'))}</a>
    </li>`).join('')}</ul>` : ''}
    <button type="button" class="primary save-readings" data-action="custom-new">${esc(t('New workout'))}</button>
    ${hasAny ? `<section><label class="toggle">
      <input type="checkbox" data-field="useCustomPlan" ${profile.useCustomPlan ? 'checked' : ''}>
      <span><strong>${esc(t('Use these as my plan'))}</strong><small>${esc(t('Your workouts take turns instead of the built-in plan.'))}</small></span>
    </label></section>` : ''}
  </main>`;
}

export function builderEditScreen({ state, workout, message }) {
  const rows = workout.exerciseIds.map((id, i) => {
    const name = t(exerciseById(id)?.name ?? id);
    return `<li class="builder-row">
      <strong>${esc(name)}</strong>
      <span class="builder-actions">
        <button type="button" class="step-small" data-action="custom-up" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="${esc(t('Move {name} up', { name }))}">↑</button>
        <button type="button" class="step-small" data-action="custom-down" data-i="${i}" ${i === workout.exerciseIds.length - 1 ? 'disabled' : ''} aria-label="${esc(t('Move {name} down', { name }))}">↓</button>
        <button type="button" class="text-button" data-action="custom-remove" data-i="${i}" aria-label="${esc(t('Remove {band}', { band: name }))}">${esc(t('Remove'))}</button>
      </span>
    </li>`;
  }).join('');
  const options = EXERCISES.filter((e) => !workout.exerciseIds.includes(e.id));
  return `<main class="page" data-workout="${esc(workout.id)}">
    ${backLink('#/builder', t('Your workouts'))}
    <h1 class="display" tabindex="-1">${esc(workout.name)}</h1>
    ${formMessage(message)}
    <section>
      <label class="select-field">${esc(t('Name'))}
        <input type="text" id="custom-name" data-custom-field="name" value="${esc(workout.name)}" maxlength="40">
      </label>
      <label class="select-field">${esc(t('Sets for each exercise'))}
        <select id="custom-sets" data-custom-field="sets">
          ${[1, 2, 3, 4, 5, 6].map((n) => `<option value="${n}" ${workout.sets === n ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
      </label>
    </section>
    <section>
      <h2>${esc(t('Exercises'))}</h2>
      ${rows ? `<ol class="builder-list">${rows}</ol>` : `<p class="hint">${esc(t('Add your first exercise below.'))}</p>`}
      <label class="select-field">${esc(t('Add an exercise'))}
        <select id="custom-add">
          ${options.map((e) => `<option value="${esc(e.id)}">${esc(t(e.name))}</option>`).join('')}
        </select>
      </label>
      <button type="button" class="secondary add-exercise" data-action="custom-add" ${options.length ? '' : 'disabled'}>${esc(t('Add exercise'))}</button>
    </section>
    <section class="button-row">
      <button type="button" class="primary" data-action="custom-start" data-id="${esc(workout.id)}" ${workout.exerciseIds.length ? '' : 'disabled'}>${esc(t('Start this workout'))}</button>
      <button type="button" class="text-button danger" data-action="custom-delete">${esc(t('Delete this workout'))}</button>
    </section>
  </main>`;
}
