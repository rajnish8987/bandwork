// Screens outside a workout. Each function returns an HTML string; app.js wires
// up the actions named in data-action and data-field attributes.

import { bandsNeedingAttention } from '../core/bandcare.js';
import { BAND_COLORS } from '../core/color.js';
import { EXERCISES, exerciseById, isAvailable } from '../core/exercises.js';
import { LANGUAGES, localeTag, t } from '../core/i18n.js';
import { balanceWarnings, MUSCLES, newRecords, personalRecords, weeklyMuscleSets, weekStreak } from '../core/insights.js';
import { programStatus, sessionSettings } from '../core/programs.js';
import { bandName, holdRange, labelFor, loadOf, prescribe, prescribeScheme, suggestBand } from '../core/progression.js';
import { comebackLevel, lighterWeekStatus } from '../core/recovery.js';
import { sessionMinutes } from '../core/session.js';
import { describeSetup } from '../core/setup.js';
import { todayPlan, weeklyTarget } from '../core/schedule.js';
import { specialForWeek } from '../core/specials.js';
import { METHOD_NOTES } from '../core/track.js';
import { exerciseSeries, loggedExerciseIds, sessionsThisWeek, weeklyCounts, workoutSummary } from '../core/stats.js';
import { formatLoad, toUnit } from '../core/units.js';
import { APP_NAME, APP_VERSION, CREDITS } from '../core/version.js';
import { voiceLabel, voicesForLanguage } from '../core/voices.js';
import { amount, bandFill, dayName, esc, longDate, plural, safeColor, shortDate } from './html.js';
import { exerciseMoments } from './specials-screen.js';
import { howTo, videoBlock } from './workout-screens.js';

const GROUPS = () => [
  [t('Legs and glutes'), ['squat', 'hinge', 'glute', 'calf']],
  [t('Push'), ['hpush', 'vpush', 'shoulder', 'triceps']],
  [t('Pull'), ['hpull', 'vpull', 'rear', 'biceps']],
  [t('Core'), ['core']],
];

const GOALS = () => [
  ['strength', t('Get stronger'), t('6–10 reps, longer rest')],
  ['muscle', t('Build muscle'), t('8–15 reps')],
  ['fitness', t('General fitness'), t('10–15 reps')],
  ['endurance', t('Build endurance'), t('15–25 reps, short rest')],
  ['fatloss', t('Burn fat'), t('12–20 reps, very short rest')],
];

const LEVELS = () => [
  ['beginner', t('Beginner'), t('New to bands, or back after a long break')],
  ['intermediate', t('Intermediate'), t('Training regularly for 6 months or more')],
  ['master', t('Master'), t('Training hard for 2 years or more')],
];

/** A person's name, links and rights, shown on every screen outside a workout. */
export function credits() {
  return `<footer class="credits">
    <p>${esc(t('Created and owned by {owner}', { owner: CREDITS.owner }))}</p>
    <p class="credit-links"><a href="${CREDITS.linkedin}" target="_blank" rel="noopener">LinkedIn</a> <a href="${CREDITS.github}" target="_blank" rel="noopener">GitHub</a></p>
    <p>${esc(APP_NAME)} ${esc(APP_VERSION)}. © ${CREDITS.year} ${esc(CREDITS.owner)}. ${esc(t('All rights reserved.'))}</p>
  </footer>`;
}

function brand() {
  return `<div class="brand"><img src="icons/icon-192.png" alt="" width="44" height="44"><span>${esc(APP_NAME)}</span></div>`;
}

export function watermark() {
  return `<div class="watermark" aria-hidden="true">${esc(APP_NAME)} ${esc(t('by {owner}', { owner: CREDITS.owner }))}</div>`;
}

function bandChips(bandIds, bands, unit) {
  const colors = bandIds.map((id) => bands.find((b) => b.id === id)?.color).filter(Boolean);
  return `<span class="dot" style="background:${bandFill(colors)}"></span> <strong>${esc(labelFor(bandIds, bands))}</strong> <span class="band-label">${esc(formatLoad(loadOf(bandIds, bands), unit))}</span>`;
}

/** Which band to begin with for each kind of exercise, at the person's level. */
export function startingBands(profile) {
  const rows = [
    [t('Lighter exercises, such as curls'), 'light'],
    [t('Medium exercises, such as rows'), 'medium'],
    [t('Stronger exercises, such as squats'), 'heavy'],
  ];
  return `<h2>${esc(t('Your starting bands'))}</h2>
    <ul class="suggestions">${rows.map(([label, tier]) => `<li><small>${esc(label)}</small><span class="suggestion-band">${bandChips(suggestBand({ tier }, profile.bands, profile.level).bandIds, profile.bands, profile.unit)}</span></li>`).join('')}</ul>
    <p class="hint">${esc(t('A starting point. If the last reps are not hard, go up a band. If your form breaks, go down.'))}</p>`;
}

function levelChoice(profile) {
  return `${choiceGroup('level', t('What is your level?'), LEVELS(), profile.level)}
    <div id="level-bands" class="level-bands">${startingBands(profile)}</div>`;
}

function moreChoices(profile) {
  const restOptions = [30, 45, 60, 90, 120, 180];
  const focusOptions = [['balanced', t('Balanced')], ['upper', t('Upper body')], ['lower', t('Lower body')], ['core', t('Core')], ['glutes', t('Glutes')], ['arms', t('Arms')]];
  const areas = [['knees', t('Knees')], ['back', t('Lower back')], ['shoulders', t('Shoulders')]];
  return `
    ${choiceGroup('focus', t('What do you want to focus on?'), focusOptions, profile.focus)}
    <p class="hint">${esc(t('Adds one set to exercises for that area.'))}</p>
    <fieldset class="toggles">
      <legend>${esc(t('Any sore areas to go easy on?'))}</legend>
      ${areas.map(([area, label]) => `<label class="toggle"><input type="checkbox" data-avoid="${area}" ${profile.avoid.includes(area) ? 'checked' : ''}><span><strong>${esc(label)}</strong></span></label>`).join('')}
      <p class="hint">${esc(t('Leaves out exercises that usually load that area. This is not medical advice, so see a doctor about pain or an injury.'))}</p>
    </fieldset>
    <label class="select-field">${esc(t('Rest between sets'))}
      <select id="rest-choice" data-field="rest">
        <option value="auto" ${profile.rest === 'auto' ? 'selected' : ''}>${esc(t('Automatic, to suit your goal'))}</option>
        ${restOptions.map((n) => `<option value="${n}" ${profile.rest === n ? 'selected' : ''}>${esc(t('{seconds} seconds', { seconds: n }))}</option>`).join('')}
      </select>
    </label>`;
}

export function nav(route) {
  const tabs = [['today', t('Today')], ['progress', t('Progress')], ['exercises', t('Exercises')], ['specials', t('Specials')], ['guide', t('Guide')], ['settings', t('Settings')]];
  return `<nav class="tabs" aria-label="${esc(t('Main'))}">
    ${tabs.map(([id, label]) => `<a href="#/${id}" ${route === id ? 'aria-current="page"' : ''}>${esc(label)}</a>`).join('')}
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

export function voicePicker(profile, voices) {
  if (!voices) return '';
  const list = voicesForLanguage(voices, localeTag());
  if (!list.length) return `<p class="hint">${esc(t('This device has no voice for this language, so cues stay silent. Beeps still play.'))}</p>`;
  const row = (uri, name, detail, online) => `<li class="voice-row">
      <label class="voice-pick">
        <input type="radio" name="voiceURI" data-field="voiceURI" value="${esc(uri)}"${(profile.voiceURI ?? '') === uri ? ' checked' : ''}>
        <span><strong>${esc(name)}</strong><small>${esc(detail)}${online ? `. ${esc(t('Needs internet'))}` : ''}</small></span>
      </label>
      <button type="button" class="secondary voice-hear" data-action="voice-hear" data-uri="${esc(uri)}" aria-label="${esc(t('Hear {name}', { name }))}">${esc(t('Hear it'))}</button>
    </li>`;
  const usual = list.find((voice) => voice.default);
  return `<fieldset class="voices">
    <legend>${esc(t('Voice'))}</legend>
    <p class="hint">${esc(t('Hear each one and choose. This list comes from this device, so your laptop and phone can differ.'))}</p>
    <ul class="voice-list">
      ${row('', t('Device default'), usual ? voiceLabel(usual).name : t('Chosen by this device'), false)}
      ${list.map((voice) => {
    const { name, detail } = voiceLabel(voice);
    return row(voice.voiceURI, name, detail, voice.localService === false);
  }).join('')}
    </ul>
  </fieldset>`;
}

function bandEditor(profile) {
  const rows = profile.bands.map((b) => `
    <li class="band-row">
      <span class="dot big" style="background:${safeColor(b.color)}"></span>
      <label class="band-field grow">${esc(t('Name'))}
        <input type="text" id="band-name-${esc(b.id)}" data-band-field="name" data-id="${esc(b.id)}" value="${esc(b.name)}" maxlength="24">
      </label>
      <label class="band-field">${esc(t('Colour'))}
        <select id="band-color-${esc(b.id)}" data-band-field="color" data-id="${esc(b.id)}">
          ${BAND_COLORS.map((c) => `<option value="${c.hex}" ${c.hex === b.color ? 'selected' : ''}>${esc(t(c.name))}</option>`).join('')}
        </select>
      </label>
      <label class="band-field narrow">${esc(profile.unit)}
        <input type="number" id="band-kg-${esc(b.id)}" inputmode="decimal" min="0.5" max="400" step="0.5" data-band-field="kg" data-id="${esc(b.id)}" value="${esc(toUnit(b.kg, profile.unit))}">
      </label>
      <button type="button" class="text-button" data-action="remove-band" data-id="${esc(b.id)}" ${profile.bands.length === 1 ? 'disabled' : ''} aria-label="${esc(t('Remove {band}', { band: b.name }))}">${esc(t('Remove'))}</button>
    </li>`).join('');
  return `
    <ul class="band-list">${rows}</ul>
    <button type="button" class="secondary" data-action="add-band">${esc(t('Add a band'))}</button>`;
}

function planChoices(profile) {
  return `
    ${choiceGroup('goal', t('What is your goal?'), GOALS(), profile.goal)}
    ${choiceGroup('daysPerWeek', t('How many days a week?'), [[2, t('2 days')], [3, t('3 days')], [4, t('4 days')], [5, t('5 days')], [6, t('6 days')], [7, t('7 days')]], profile.daysPerWeek)}
    ${choiceGroup('minutes', t('How long is a session?'), [[15, t('15 min')], [20, t('20 min')], [30, t('30 min')], [45, t('45 min')], [60, t('60 min')]], profile.minutes)}`;
}

function equipmentChoices(profile) {
  return `<fieldset class="toggles">
    <legend>${esc(t('What else do you have?'))}</legend>
    ${toggle('hasAnchor', t('Door anchor'), t('Adds pulldowns, pressdowns and rotation work'), profile.hasAnchor)}
    ${toggle('hasMini', t('Mini loop band'), t('Adds lateral walks for your glutes'), profile.hasMini)}
  </fieldset>`;
}

function languageChoice(profile) {
  return `<label class="select-field">${esc(t('Language'))}
    <select id="language" data-field="language">
      <option value="" ${profile.language ? '' : 'selected'}>${esc(t('Same as this device'))}</option>
      ${LANGUAGES.map((l) => `<option value="${l.id}" ${profile.language === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
    </select>
  </label>`;
}

function unitChoice(profile) {
  return choiceGroup('unit', t('Units'), [['kg', t('Kilograms (kg)')], ['lb', t('Pounds (lb)')]], profile.unit);
}

function formMessage(message) {
  return `<p id="form-message" class="message ${message?.kind ?? ''}" role="status" ${message ? '' : 'hidden'}>${esc(message?.text ?? '')}</p>`;
}

export function setupScreen({ state, message }) {
  const { profile } = state;
  return `<main class="page setup">
    ${brand()}
    <h1 class="display" tabindex="-1">${esc(t('Set up your bands'))}</h1>
    <p class="lead">${esc(t('Your plan is built from the bands you own. All of it stays on this device.'))}</p>
    ${languageChoice(profile)}
    <section>${levelChoice(profile)}</section>
    <section>
      <h2>${esc(t('Your bands'))}</h2>
      <p class="hint">${esc(t('These are usual tensions for each colour. Change them to match the label on your bands. A rough figure is fine, and you can measure them properly later.'))}</p>
      ${bandEditor(profile)}
    </section>
    <section>${unitChoice(profile)}</section>
    <section>${equipmentChoices(profile)}</section>
    <section>${planChoices(profile)}</section>
    <details class="how more-options">
      <summary>${esc(t('More options'))}</summary>
      ${moreChoices(profile)}
    </details>
    <p class="hint plan-promise">${esc(t('We will build a 4 week short term plan and a 24 week long term plan from your answers.'))}</p>
    ${formMessage(message)}
    <button type="button" class="primary" data-action="finish-setup">${esc(t('Build my plan'))}</button>
  </main>`;
}

function weekMeter(done, target) {
  const cells = Array.from({ length: Math.max(target, done) }, (_, i) => `<span class="${i < done ? 'on' : ''}"></span>`).join('');
  return `<div class="week">
    <div class="week-cells" aria-hidden="true">${cells}</div>
    <p>${esc(t('{done} of {target} workouts this week', { done, target }))}</p>
  </div>`;
}

function streakLine(workouts, target, now) {
  const { current } = weekStreak(workouts, target, now);
  return current >= 2 ? `<p class="streak">${esc(t('{n} weeks in a row', { n: current }))}</p>` : '';
}

function todayNotices(state, now, active) {
  const { profile, workouts } = state;
  const notices = [];
  const program = programStatus(profile, now);
  if (program?.finished) {
    notices.push(`<p class="notice">${esc(t('You finished {program}. Well done.', { program: t(program.program.name) }))} <a href="#/programs">${esc(t('Choose what is next'))}</a></p>`);
  }
  if (!active) {
    const comeback = comebackLevel(workouts, now);
    const lighter = lighterWeekStatus(state, now);
    if (comeback) {
      notices.push(`<p class="notice">${esc(t('Welcome back. Your bands and reps are lighter today, so your body can catch up.'))}</p>`);
    } else if (lighter.active) {
      const why = lighter.reason === 'effort'
        ? t('Your recent sets were at your limit, so this week is lighter: fewer sets and reps to spare.')
        : t('This is a lighter week: fewer sets and reps to spare, so your body can catch up.');
      notices.push(`<p class="notice">${esc(why)}${lighter.reason === 'program' ? '' : ` <button type="button" class="text-button" data-action="skip-lighter">${esc(t('Train normally this week'))}</button>`}</p>`);
    }
  }
  for (const { band, health } of bandsNeedingAttention(profile.bands, workouts, now).slice(0, 2)) {
    const text = health.status === 'replace'
      ? t('{band} is getting old. Think about replacing it.', { band: bandName(band.name) })
      : t('{band} is due for a safety check.', { band: bandName(band.name) });
    notices.push(`<p class="notice">${esc(text)} <a href="#/bands">${esc(t('Check your bands'))}</a></p>`);
  }
  return notices.join('');
}

function customList(profile) {
  const list = profile.customWorkouts ?? [];
  return `<section class="your-workouts">
    <h2>${esc(t('Your workouts'))}</h2>
    ${list.length ? `<ul class="history">${list.map((w) => `<li class="history-row">
      <div><strong>${esc(w.name)}</strong><small>${esc(plural(w.exerciseIds.length, 'exercise'))}</small></div>
      <button type="button" class="secondary small" data-action="custom-start" data-id="${esc(w.id)}" aria-label="${esc(t('Start {name}', { name: w.name }))}">${esc(t('Start'))}</button>
    </li>`).join('')}</ul>` : ''}
    <a class="plain-link" href="#/builder">${esc(list.length ? t('Edit your workouts') : t('Build your own workout'))}</a>
  </section>`;
}

/** One exercise's plan for the Today list. */
function rowPlan(entry, exercise, session, profile) {
  const { range } = session;
  const sets = plural(entry.targetSets, 'set');
  const band = labelFor(entry.target.bandIds, profile.bands);
  if (exercise.timed) {
    const hold = holdRange(range);
    return t('{sets} of {min}–{max} seconds', { sets, min: hold.min, max: hold.max });
  }
  if (session.scheme) {
    const reps = session.scheme.slice(0, entry.targetSets).join(', ');
    if (exercise.bodyweight) return t('{sets}: {reps}, no band', { sets, reps });
    return exercise.perSide ? t('{sets}: {reps} each side on {band}', { sets, reps, band }) : t('{sets}: {reps} on {band}', { sets, reps, band });
  }
  const values = { sets, min: range.min, max: range.max, band };
  if (exercise.bodyweight) return t('{sets} of {min}–{max}, no band', values);
  return exercise.perSide ? t('{sets} of {min}–{max} each side on {band}', values) : t('{sets} of {min}–{max} on {band}', values);
}

function trackExtras(program, plan) {
  if (!plan?.track) return '';
  const video = specialForWeek(program.week);
  return `${plan.method && plan.kind === 'workout' ? `<p class="hint method-note">${esc(t(METHOD_NOTES[plan.method]))}</p>` : ''}
    ${video ? `<a class="plain-link" href="#/specials/special-${esc(video.id)}">${esc(t('Watch this week\'s video'))}</a>` : ''}`;
}

export function todayScreen({ state, preview, now, message }) {
  const { profile, workouts, active } = state;
  const session = active ?? preview;
  const rows = session.exercises.map((e) => {
    const ex = exerciseById(e.exerciseId);
    const colors = e.target.bandIds.map((id) => profile.bands.find((b) => b.id === id)?.color).filter(Boolean);
    const status = e.sets.length >= e.targetSets ? t('Done') : e.skipped ? t('Skipped') : e.sets.length ? t('{done} of {total} sets done', { done: e.sets.length, total: e.targetSets }) : null;
    const plan = rowPlan(e, ex, session, profile);
    return `<li>
      <a class="ladder-row" href="#/exercises/${esc(ex.id)}">
        <span class="stripe" style="background:${bandFill(colors)}"></span>
        <span class="ladder-text">
          <strong>${esc(t(ex.name))}</strong>
          <small>${esc(status ?? plan)}</small>
        </span>
      </a>
    </li>`;
  }).join('');
  const anchorNeeded = session.exercises.some((e) => exerciseById(e.exerciseId).anchor);
  const program = programStatus(profile, now);
  const target = weeklyTarget(profile, now);
  const plan = active ? null : todayPlan(state, now);
  const offToday = plan?.kind === 'rest' || plan?.kind === 'done' || plan?.kind === 'cardio';
  const offTitle = { rest: t('Rest day'), done: t('Done for today'), cardio: t('Cardio day') };
  const nextLine = plan?.next
    ? t('Your next workout is {name} on {day}.', { name: t(plan.next.name), day: dayName(plan.next.day) })
    : t('No workouts are scheduled.');
  const hero = offToday
    ? `<h1 class="display huge" tabindex="-1">${esc(offTitle[plan.kind])}</h1>
      ${plan.kind === 'cardio' ? `<p class="lead">${esc(t('Walk, jog or run for 20 to 25 minutes, at a pace you enjoy.'))}</p>` : ''}
      <p class="lead">${esc(nextLine)}</p>
      ${trackExtras(program, plan)}
      <a class="secondary hero-second" href="#/workout" data-action="start-workout">${esc(t('Train anyway'))}</a>`
    : `<p class="eyebrowless">${esc(active ? t('In progress') : t('Next workout'))}</p>
      <h1 class="display huge" tabindex="-1">${esc(t(session.name))}</h1>
      <p class="lead">${esc(t('{count}, about {minutes} minutes', { count: plural(session.exercises.length, 'exercise'), minutes: sessionMinutes(session) }))}</p>
      ${trackExtras(program, plan)}
      <a class="primary" href="#/workout" data-action="${active ? 'resume-workout' : 'start-workout'}">${esc(active ? t('Resume workout') : t('Start workout'))}</a>
      ${active ? '' : `<button type="button" class="secondary hero-second" data-action="start-quick">${esc(t('Only 10 minutes today'))}</button>`}
      <p class="hint safety">${esc(t('Check your bands for nicks or cracks first, and replace a damaged band.'))}${anchorNeeded ? ` ${esc(t('Test the door anchor with a firm pull.'))}` : ''} ${esc(t('Stop if anything hurts.'))}</p>`;

  return `<main class="page today">
    ${message ? `<p class="message ${message.kind}" role="status">${esc(message.text)}</p>` : ''}
    <div class="today-hero">
      ${weekMeter(sessionsThisWeek(workouts, now), target)}
      ${streakLine(workouts, target, now)}
      ${program?.phase ? `<p class="streak">${esc(t('{program}: week {week} of {total}, {phase}', { program: t(program.program.name), week: program.week, total: program.totalWeeks, phase: t(program.phase.name) }))}</p>` : ''}
      ${todayNotices(state, now, active)}
      ${workouts.length || active ? '' : `<p class="notice">${esc(t('New here? See how everything works.'))} <a href="#/guide">${esc(t('Open the guide'))}</a></p>`}
      ${hero}
    </div>
    <div>
      ${offToday ? '' : `<ol class="ladder">${rows}</ol>`}
      ${active ? '' : customList(profile)}
    </div>
  </main>`;
}

function weeksChart(workouts, target, now) {
  const weeks = weeklyCounts(workouts, 12, now);
  const hit = weeks.filter((w) => w.count >= target).length;
  const peak = Math.max(target, ...weeks.map((w) => w.count));
  const { current, best } = weekStreak(workouts, target, now);
  const columns = weeks.map((w) => `
    <div class="week-col" title="${esc(t('Week of {date}: {count}', { date: shortDate(w.start), count: plural(w.count, 'workout') }))}">
      ${Array.from({ length: peak }, (_, i) => `<span class="${i < w.count ? 'on' : ''}"></span>`).reverse().join('')}
    </div>`).join('');
  return `<section>
    <h2>${esc(t('Last 12 weeks'))}</h2>
    <div class="weeks" role="img" aria-label="${esc(t('Workouts per week. You reached your target of {target} in {hit} of the last 12 weeks.', { target, hit }))}">${columns}</div>
    <p class="hint">${esc(t('Reached your target of {target} a week in {hit} of 12 weeks.', { target, hit }))}</p>
    <p class="streak">${esc(t('Streak: {current}. Best: {best}.', { current: plural(current, 'week'), best: plural(best, 'week') }))}</p>
    <p class="hint">${esc(t('A streak counts weeks that reach your target, so a missed day never breaks it.'))}</p>
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

function exerciseChart(series, range, selected, unit, exercise) {
  const recent = series.slice(-12);
  const top = Math.max(range.max, ...recent.map((p) => p.reps));
  const point = recent[selected] ?? recent.at(-1);
  const bandChanged = (i) => i === 0 || recent[i].label !== recent[i - 1].label;
  const describe = (p) => t('{date}: {reps} on {band}', { date: shortDate(p.at), reps: amount(exercise, p.reps), band: p.label });
  const bars = recent.map((p, i) => {
    const show = bandChanged(i) || i === recent.length - 1;
    return `<button type="button" class="bar" data-action="chart-point" data-i="${i}" style="--h:${(p.reps / top) * 100}%;--fill:${bandFill(p.colors)}" aria-label="${esc(describe(p))}" ${i === (selected ?? recent.length - 1) ? 'aria-pressed="true"' : 'aria-pressed="false"'}>
      <span class="bar-fill">${show ? `<span class="bar-label">${p.reps}</span>` : ''}</span>
    </button>`;
  }).join('');
  const seen = new Map();
  for (const p of recent) if (!seen.has(p.label)) seen.set(p.label, p.colors);
  const legend = seen.size > 1
    ? `<ul class="legend">${[...seen].map(([label, colors]) => `<li><span class="dot" style="background:${bandFill(colors)}"></span>${esc(label)}</li>`).join('')}</ul>`
    : '';
  const pointSetup = describeSetup(point.setup);

  return `
    <div class="chart">
      <div class="chart-guide" style="bottom:${(range.max / top) * 100}%"><span>${range.max}</span></div>
      <div class="chart-guide" style="bottom:${(range.min / top) * 100}%"><span>${range.min}</span></div>
      <div class="bars">${bars}</div>
    </div>
    <div class="band-runs" aria-hidden="true">${bandRuns(recent).map((run) => `<span style="flex-grow:${run.count}">${esc(run.label)}</span>`).join('')}</div>
    <div class="chart-axis"><span>${esc(shortDate(recent[0].at))}</span><span>${esc(shortDate(recent.at(-1).at))}</span></div>
    ${legend}
    <p class="readout" role="status">${esc(t('{date}: best set {reps} on {band} ({load})', { date: longDate(point.at), reps: amount(exercise, point.reps), band: point.label, load: formatLoad(point.kg, unit) }))}${pointSetup ? `. ${esc(pointSetup)}` : ''}</p>
    <p class="hint">${esc(t('Bars show the best set of each session, in the colour of the band. Lines mark your rep range. Reach the top line on every set and the next session moves you to a stronger band.'))}</p>
    <details class="how">
      <summary>${esc(t('Show as a table'))}</summary>
      <table>
        <thead><tr><th scope="col">${esc(t('Date'))}</th><th scope="col">${esc(t('Best reps'))}</th><th scope="col">${esc(t('Band'))}</th><th scope="col">${esc(unit)}</th><th scope="col">${esc(t('Setup'))}</th></tr></thead>
        <tbody>${[...series].reverse().map((p) => `<tr><td>${esc(shortDate(p.at))}</td><td>${p.reps}</td><td>${esc(p.label)}</td><td>${esc(toUnit(p.kg, unit))}</td><td>${esc(describeSetup(p.setup))}</td></tr>`).join('')}</tbody>
      </table>
    </details>`;
}

function muscleChart(workouts, now) {
  const week = weeklyMuscleSets(workouts, now);
  const top = Math.max(10, ...week.map((m) => m.sets));
  return `<section>
    <h2>${esc(t('Sets per muscle, last 7 days'))}</h2>
    <ul class="muscles">${week.map((m) => `<li class="muscle-row">
      <span class="muscle-name">${esc(t(m.name))}</span>
      <span class="muscle-track"><span class="muscle-bar" style="width:${(m.sets / top) * 100}%"></span></span>
      <span class="muscle-sets">${m.sets}</span>
    </li>`).join('')}</ul>
    <p class="hint">${esc(t('Helping muscles count as half a set. A common guide is about 10 sets a week for each muscle you want to grow.'))}</p>
  </section>`;
}

function warningText(w) {
  const counts = { have: w.have, against: w.against };
  switch (w.id) {
    case 'pull-low': return t('In four weeks you did {have} pulling sets and {against} pushing sets. Add rows or pull-aparts to protect your shoulders.', counts);
    case 'push-low': return t('In four weeks you did {have} pushing sets and {against} pulling sets. Add a press to stay balanced.', counts);
    case 'hinge-low': return t('In four weeks you did {have} sets for the back of your legs and {against} for the front. Add deadlifts or bridges.', counts);
    case 'knee-low': return t('In four weeks you did {have} sets for the front of your legs and {against} for the back. Add squats.', counts);
    case 'neglected': return t('{muscle}: no sets in the last two weeks.', { muscle: t(MUSCLES.find((m) => m.id === w.muscle).name) });
    default: return '';
  }
}

function balanceSection(workouts, now) {
  const warnings = balanceWarnings(workouts, now);
  if (!warnings.length) return '';
  return `<section>
    <h2>${esc(t('Balance'))}</h2>
    ${warnings.map((w) => `<p class="notice">${esc(warningText(w))}</p>`).join('')}
  </section>`;
}

function recordsSection(workouts, unit) {
  const records = personalRecords(workouts).slice(0, 8);
  if (!records.length) return '';
  return `<section>
    <h2>${esc(t('Personal records'))}</h2>
    <ul class="history">${records.map((r) => `<li class="history-row">
      <div><strong>${esc(t(exerciseById(r.exerciseId)?.name ?? r.exerciseId))}</strong>
      <small>${esc(t('{reps} on {band} ({load}), {date}', { reps: amount(exerciseById(r.exerciseId), r.reps), band: r.label, load: formatLoad(r.kg, unit), date: shortDate(r.at) }))}</small></div>
    </li>`).join('')}</ul>
  </section>`;
}

export function progressScreen({ state, now, chartExercise, chartPoint }) {
  const { workouts, profile } = state;
  if (!workouts.length) {
    return `<main class="page">
      <h1 class="display" tabindex="-1">${esc(t('Progress'))}</h1>
      <p class="lead">${esc(t('Your first workout starts the record. Each exercise then gets its own chart.'))}</p>
      <a class="primary" href="#/today">${esc(t(`Go to today's workout`))}</a>
    </main>`;
  }
  const ids = loggedExerciseIds(workouts);
  const current = ids.includes(chartExercise) ? chartExercise : ids[0];
  const name = (id) => t(exerciseById(id)?.name ?? id);
  const series = exerciseSeries(workouts, current);
  const history = [...workouts].reverse().slice(0, 30).map((w) => {
    const s = workoutSummary(w);
    const line = t('{date}. {sets}, {reps}, {minutes}', { date: longDate(w.finishedAt), sets: plural(s.sets, 'set'), reps: plural(s.reps, 'rep'), minutes: plural(s.minutes, 'minute') });
    return `<li class="history-row">
      <div><strong>${esc(t(w.name))}</strong><small>${esc(line)}</small></div>
      <button type="button" class="text-button" data-action="delete-workout" data-id="${esc(w.id)}" aria-label="${esc(t('Delete {name} from {date}', { name: t(w.name), date: longDate(w.finishedAt) }))}">${esc(t('Delete'))}</button>
    </li>`;
  }).join('');

  return `<main class="page progress">
    <h1 class="display" tabindex="-1">${esc(t('Progress'))}</h1>
    ${weeksChart(workouts, weeklyTarget(profile), now)}
    ${muscleChart(workouts, now)}
    ${balanceSection(workouts, now)}
    <section>
      <h2>${esc(t('By exercise'))}</h2>
      <label class="select-field">${esc(t('Exercise'))}
        <select id="chart-exercise" data-field-ui="chartExercise">
          ${ids.map((id) => `<option value="${esc(id)}" ${id === current ? 'selected' : ''}>${esc(name(id))}</option>`).join('')}
        </select>
      </label>
      ${exerciseChart(series, sessionSettings(profile, now, exerciseById(current)).range, chartPoint, profile.unit)}
    </section>
    ${recordsSection(workouts, profile.unit)}
    <section>
      <h2>${esc(t('Workouts'))}</h2>
      <ul class="history">${history}</ul>
    </section>
  </main>`;
}

export function libraryScreen({ state, query }) {
  const { profile } = state;
  const q = query.trim().toLowerCase();
  const match = (e) => !q || `${e.name} ${e.muscles} ${t(e.name)} ${t(e.muscles)}`.toLowerCase().includes(q);
  const sections = GROUPS().map(([title, patterns]) => {
    const list = EXERCISES.filter((e) => patterns.includes(e.pattern) && match(e));
    if (!list.length) return '';
    return `<section>
      <h2>${esc(title)}</h2>
      <ul class="library">${list.map((e) => `<li>
        <a class="library-row" href="#/exercises/${esc(e.id)}">
          <strong>${esc(t(e.name))}</strong>
          <small>${esc(t(e.muscles))}${isAvailable(e, profile) ? '' : `. ${esc(e.anchor ? t('Needs a door anchor') : t('Needs a mini loop'))}`}</small>
        </a>
      </li>`).join('')}</ul>
    </section>`;
  }).join('');
  return `<main class="page">
    <h1 class="display" tabindex="-1">${esc(t('Exercises'))}</h1>
    <label class="select-field">${esc(t('Find an exercise or muscle'))}
      <input type="search" id="library-search" data-field-ui="query" value="${esc(query)}" autocomplete="off">
    </label>
    ${sections || `<p class="lead">${esc(t('Nothing matches "{query}". Try a muscle, such as back or glutes.', { query }))}</p>`}
  </main>`;
}

export function exerciseScreen({ state, id }) {
  const e = exerciseById(id);
  const band = state.profile.bands[Math.min(1, state.profile.bands.length - 1)];
  const notes = [t(e.muscles)];
  if (e.anchor) notes.push(t('Needs a door anchor'));
  if (e.mini) notes.push(t('Needs a mini loop'));
  if (e.perSide) notes.push(t('Done on each side'));
  if (e.bodyweight) notes.push(t('No band needed'));
  return `<main class="page exercise" style="--band:${safeColor(band?.color)}">
    <a class="back" href="#/exercises" data-action="go-back">${esc(t('Back'))}</a>
    <h1 class="display" tabindex="-1">${esc(t(e.name))}</h1>
    <p class="lead">${esc(notes.join('. '))}.</p>
    <div class="exercise-figure" data-figure="${esc(e.id)}"></div>
    <button type="button" class="secondary try-camera" data-action="camera-practice" data-id="${esc(e.id)}">${esc(t('Try Camera coach'))}</button>
    ${e.bodyweight ? '' : `<section>
      <h2>${esc(t('Suggested band'))}</h2>
      <ul class="suggestions">${LEVELS().map(([level, label]) => `<li class="${level === state.profile.level ? 'your-level' : ''}"><small>${esc(label)}${level === state.profile.level ? ` (${esc(t('your level'))})` : ''}</small><span class="suggestion-band">${bandChips(suggestBand(e, state.profile.bands, level).bandIds, state.profile.bands, state.profile.unit)}</span></li>`).join('')}</ul>
    </section>`}
    <section class="how-open">
      <h2>${esc(t('How to do it'))}</h2>
      ${howTo(e)}
      ${videoBlock(e, state.profile)}
    </section>
    ${exerciseMoments(e.id)}
  </main>`;
}

export function summaryScreen({ state, workout, now }) {
  const { profile, workouts } = state;
  const s = workoutSummary(workout);
  const { range } = sessionSettings(profile, now);
  const upToThis = workouts.filter((w) => w.finishedAt <= workout.finishedAt && !w.lighter);
  const rows = workout.exercises.map((entry) => {
    const ex = exerciseById(entry.exerciseId);
    const history = upToThis.flatMap((w) => w.exercises.filter((x) => x.exerciseId === entry.exerciseId && x.sets.length));
    let next = null;
    if (ex && history.length) next = workout.scheme ? prescribeScheme(ex, history, profile.bands, workout.scheme, profile.level) : prescribe(ex, history, profile.bands, range);
    const reps = entry.sets.map((set) => set.reps).join(', ');
    const last = entry.sets.at(-1);
    return `<li class="summary-row">
      <span class="stripe" style="background:${bandFill(last.colors)}"></span>
      <div>
        <strong>${esc(t(ex?.name ?? entry.exerciseId))}</strong>
        <small>${esc(ex?.timed ? t('{band}: {reps} seconds', { band: last.label, reps }) : t('{band}: {reps} reps', { band: last.label, reps }))}</small>
        ${next ? `<small class="next-time">${esc(t('Next time: {note}', { note: next.note }))}</small>` : ''}
      </div>
    </li>`;
  }).join('');
  const records = newRecords(workout, workouts);
  return `<main class="page summary">
    <h1 class="display huge" tabindex="-1">${esc(t('Workout logged'))}</h1>
    <p class="lead">${esc(t('{name}: {sets}, {reps}, {minutes}.', { name: t(workout.name), sets: plural(s.sets, 'set'), reps: plural(s.reps, 'rep'), minutes: plural(s.minutes, 'minute') }))}</p>
    ${records.length ? `<section class="records-new">
      <h2>${esc(records.length === 1 ? t('New record') : t('New records'))}</h2>
      <ul>${records.map((r) => `<li><strong>${esc(t(exerciseById(r.exerciseId)?.name ?? r.exerciseId))}</strong>: ${esc(t('{reps} on {band} ({load})', { reps: amount(exerciseById(r.exerciseId), r.reps), band: r.label, load: formatLoad(r.kg, profile.unit) }))}</li>`).join('')}</ul>
    </section>` : ''}
    ${weekMeter(sessionsThisWeek(workouts, now), weeklyTarget(profile))}
    ${streakLine(workouts, weeklyTarget(profile), now)}
    <ul class="summary-list">${rows}</ul>
    <a class="primary" href="#/today">${esc(t('Back to today'))}</a>
  </main>`;
}

const WEEKDAYS = () => [[1, t('Mon')], [2, t('Tue')], [3, t('Wed')], [4, t('Thu')], [5, t('Fri')], [6, t('Sat')], [0, t('Sun')]];

function remindersSection(profile, native) {
  const { days, time } = profile.reminders;
  return `<section>
    <h2>${esc(t('Workout reminders'))}</h2>
    <fieldset class="day-picker">
      <legend>${esc(t('Which days?'))}</legend>
      ${WEEKDAYS().map(([day, label]) => `<label class="day"><input type="checkbox" data-reminder-day="${day}" ${days.includes(day) ? 'checked' : ''}><span>${esc(label)}</span></label>`).join('')}
    </fieldset>
    <label class="select-field">${esc(t('What time?'))}
      <input type="time" id="reminder-time" data-reminder-time value="${esc(time)}">
    </label>
    <p id="reminder-message" class="message" role="status" hidden></p>
    ${native
    ? `<p class="hint">${esc(t('Your phone will notify you at this time on the days you choose. To save battery, Android can deliver a reminder some minutes late.'))}</p>
       <button type="button" class="secondary small" data-action="reminder-exact" ${days.length ? '' : 'disabled'}>${esc(t('Get reminders exactly on time'))}</button>`
    : `<p class="hint">${esc(t('Add these to your calendar, and your calendar will remind you. A browser cannot send reminders while it is closed.'))}</p>
       <button type="button" class="secondary" data-action="reminder-calendar" ${days.length ? '' : 'disabled'}>${esc(t('Add to my calendar'))}</button>`}
  </section>`;
}

export function settingsScreen({ state, message, dataMessage, canInstall, secure, native, voices }) {
  const { profile, workouts } = state;
  return `<main class="page settings">
    <h1 class="display" tabindex="-1">${esc(t('Settings'))}</h1>
    ${formMessage(message)}
    <section>
      <h2>${esc(t('Your bands'))}</h2>
      ${bandEditor(profile)}
      <button type="button" class="text-button" data-action="bands-standard">${esc(t('Use the usual tension for each colour'))}</button>
      <a class="plain-link" href="#/bands">${esc(t('Measure and check your bands'))}</a>
    </section>
    <section>${equipmentChoices(profile)}</section>
    <section>${levelChoice(profile)}</section>
    <section>
      <h2>${esc(t('Your plan'))}</h2>
      ${planChoices(profile)}
      ${moreChoices(profile)}
      <div class="toggles">
        ${toggle('autoLighter', t('Automatic lighter weeks'), t('Eases off after six straight weeks, or when your sets are mostly at your limit'), profile.autoLighter)}
      </div>
      <p class="hint">${esc(t('Changes apply from your next workout. Your history stays.'))}</p>
      <div class="link-list">
        <a class="plain-link" href="#/schedule">${esc(t('Choose a workout for each day'))}</a>
        <a class="plain-link" href="#/programs">${esc(t('Your short and long term plan'))}</a>
        <a class="plain-link" href="#/builder">${esc(t('Build your own workout'))}</a>
      </div>
    </section>
    <section>
      <h2>${esc(t('Coach'))}</h2>
      <div class="toggles">
        ${toggle('voice', t('Speak cues out loud'), t('Reads each set and counts reps, so your hands stay free'), profile.voice)}
        ${toggle('warmups', t('Guided warm-up'), t('A few timed moves before you start'), profile.warmups)}
        ${toggle('cooldowns', t('Guided cool-down'), t('A few stretches when you finish'), profile.cooldowns)}
      </div>
      <div id="voice-picker">${voicePicker(profile, voices)}</div>
      ${choiceGroup('tempo', t('Rep count speed'), [['fast', t('Quick'), t('1 up, 2 down')], ['steady', t('Steady'), t('2 up, 2 down')], ['slow', t('Slow'), t('2 up, 4 down')]], profile.tempo)}
    </section>
    <section>
      <h2>${esc(t('Rest timer'))}</h2>
      <div class="toggles">
        ${toggle('sound', t('Play a sound when rest ends'), t('Also plays the rep count beeps'), profile.sound)}
        ${toggle('vibrate', t('Vibrate when rest ends'), t('Android phones only'), profile.vibrate)}
      </div>
    </section>
    ${remindersSection(profile, native)}
    <section>
      <h2>${esc(t('Language and units'))}</h2>
      ${languageChoice(profile)}
      ${unitChoice(profile)}
    </section>
    <section>
      <h2>${esc(t('About'))}</h2>
      ${brand()}
      <p>${esc(APP_NAME)} ${esc(t('version {version}', { version: APP_VERSION }))}</p>
      <p class="hint">${esc(t('The web app and the Android app are built from the same code, so a matching version number means matching features.'))}</p>
      <p class="hint">${esc(t('Exercise videos belong to their YouTube channels.'))}</p>
      ${canInstall ? `<button type="button" class="secondary" data-action="install">${esc(t('Install Tensile'))}</button>` : ''}
      ${secure ? `<p class="hint">${esc(t('Tensile is ready to work with no connection.'))}</p>` : `<p class="hint">${esc(t('This address needs a connection to your laptop, because offline use needs a secure address. See the README to set up the installable version.'))}</p>`}
    </section>
    <section>
      <h2>${esc(t('Your data'))}</h2>
      <p class="hint">${esc(t('Your laptop and phone keep separate records. Save a backup on one and restore it on the other to move your data. You have {count} logged here.', { count: plural(workouts.length, 'workout') }))}</p>
      <div class="button-row">
        <button type="button" class="secondary" data-action="export">${esc(t('Save a backup'))}</button>
        <label class="secondary file-button">${esc(t('Restore a backup'))}
          <input type="file" id="import-file" accept="application/json,.json" data-action-change="import">
        </label>
      </div>
      ${dataMessage ? `<p class="message ${dataMessage.kind}" role="status">${esc(dataMessage.text)}</p>` : ''}
      <button type="button" class="text-button danger" data-action="reset">${esc(t('Erase everything on this device'))}</button>
    </section>
  </main>`;
}
