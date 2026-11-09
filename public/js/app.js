import { summariseReadings } from './core/bandcare.js';
import { HOLD_TEMPO, restAnnouncement, setAnnouncement, tempoAt, TEMPOS } from './core/coach.js';
import { BAND_COLORS } from './core/color.js';
import { exerciseById } from './core/exercises.js';
import { localeTag, pickLanguage, setLanguage, t } from './core/i18n.js';
import { removeOldCopies } from './core/old-address.js';
import { swapOptions } from './core/plan.js';
import { bandName, labelFor } from './core/progression.js';
import { buildIcs } from './core/reminders.js';
import { supportsRepCount } from './core/repcount.js';
import { cooldownFor, warmupFor } from './core/routines.js';
import { defaultWeek } from './core/schedule.js';
import {
  addRest, currentStep, finishSession, logSet, plannedReps, setEntrySetup, skipExercise, skipRest, startSession, swapInSession, undoLastSet,
} from './core/session.js';
import { describeSetup } from './core/setup.js';
import { parseRoute as readRoute } from './core/route.js';
import { defaultState, loadState, makeBackup, MAX_BACKUP_BYTES, newBand, newId, parseBackup, saveState, STANDARD_TENSIONS } from './core/store.js';
import { formatLoad, fromUnit, toUnit } from './core/units.js';
import { weekStart } from './core/stats.js';
import { TRACK_ID, trackStartFor } from './core/track.js';
import { embedUrl, parseYouTubeId, videoFor } from './core/videos.js';
import { specialsScreen } from './ui/specials-screen.js';
import {
  bandsScreen, builderEditScreen, builderListScreen, guideScreen, measureScreen, programsScreen, scheduleScreen,
} from './ui/extra-screens.js';
import { keepScreenOn, restEnded, tempoBeep, unlockSound } from './ui/feedback.js';
import { mountFigure, stopFigures } from './ui/figure.js';
import { applyNativeReminders, isNative, saveTextFile } from './ui/native.js';
import {
  credits, exerciseScreen, libraryScreen, nav, progressScreen, settingsScreen, setupScreen, startingBands, summaryScreen, todayScreen, voicePicker, watermark,
} from './ui/screens.js';
import { canSpeak, loadVoices, speak, stopSpeaking } from './ui/voice.js';
import { goalText, setOfText, fieldColors, restScreen, routineScreen, setScreen } from './ui/workout-screens.js';

const root = document.getElementById('app');
const REP_LIMIT = 200;
const REST_WARNING_SECONDS = 10;

let state = loadState(localStorage);
const ui = {
  draft: null,
  query: '',
  chartExercise: null,
  chartPoint: null,
  message: null,
  installPrompt: null,
  saveFailed: false,
  routine: null,
  announced: null,
  restWarned: false,
};
let restTimer = null;
let restTotal = 0;
let routineTimer = null;
let tempo = null;
let lastRoute = null;

function applyLanguage() {
  setLanguage(state.profile.language ?? pickLanguage(navigator.language));
  document.documentElement.lang = localeTag().slice(0, 2);
}

function commit(next) {
  state = next;
  ui.saveFailed = !saveState(localStorage, state);
  applyLanguage();
}

function editProfile(change) {
  const next = structuredClone(state);
  change(next.profile);
  commit(next);
}

const parseRoute = () => readRoute(location.hash);

const go = (hash) => {
  if (location.hash === hash) render();
  else location.hash = hash;
};

function take(key) {
  const value = ui[key];
  ui[key] = null;
  return value;
}

const voiceSample = () => t('One, two, three. Keep your back straight.');

const say = (text) => {
  if (state.profile.voice || ui.handsFree) speak(text, state.profile.voiceURI); // in hands-free mode, sound is the whole interface
};

/* ---------- Starting a workout, warm-up and cool-down ---------- */

function beginSession(options = {}) {
  unlockSound();
  commit(startSession(state, Date.now(), options));
  ui.draft = null;
  ui.announced = null;
  if (state.profile.warmups && !options.quick) startRoutine('warmup');
  else go('#/workout');
}

function makeRoutine(kind, workoutId) {
  const workout = kind === 'cooldown' ? state.workouts.find((w) => w.id === workoutId) : state.active;
  if (!workout) return null;
  const moves = kind === 'warmup' ? warmupFor(workout, state.profile.minutes) : cooldownFor(workout);
  return { kind, workoutId, moves, index: 0, endsAt: Date.now() + moves[0].seconds * 1000, spoken: -1 };
}

function startRoutine(kind, workoutId) {
  ui.routine = makeRoutine(kind, workoutId);
  go(`#/routine/${kind}${workoutId ? `/${encodeURIComponent(workoutId)}` : ''}`);
}

function endRoutine() {
  const { kind, workoutId } = ui.routine;
  ui.routine = null;
  stopSpeaking();
  go(kind === 'warmup' ? '#/workout' : `#/summary/${encodeURIComponent(workoutId)}`);
}

function nextMove() {
  const routine = ui.routine;
  if (routine.index + 1 >= routine.moves.length) {
    endRoutine();
    return;
  }
  routine.index += 1;
  routine.endsAt = Date.now() + routine.moves[routine.index].seconds * 1000;
  render();
}

function tickRoutine() {
  const routine = ui.routine;
  if (!routine) return;
  const left = routine.endsAt - Date.now();
  if (left <= 0) {
    if (state.profile.sound) tempoBeep(true);
    if (state.profile.vibrate) navigator.vibrate?.(150);
    nextMove();
    return;
  }
  const count = document.getElementById('routine-count');
  const seconds = String(Math.ceil(left / 1000));
  if (count && count.textContent !== seconds) count.textContent = seconds;
  document.getElementById('routine-band')?.style.setProperty('--p', left / (routine.moves[routine.index].seconds * 1000));
}

function routineHtml(route) {
  if (ui.routine?.kind !== route.arg) ui.routine = makeRoutine(route.arg, route.extra);
  if (!ui.routine) return null;
  const { kind, moves, index, endsAt } = ui.routine;
  const move = moves[index];
  const left = Math.max(0, endsAt - Date.now());
  return routineScreen({
    kind,
    move,
    index,
    total: moves.length,
    seconds: Math.ceil(left / 1000),
    progress: left / (move.seconds * 1000),
    bandColor: state.profile.bands[0]?.color,
  });
}

/* ---------- Workout flow ---------- */

function draftFor(step) {
  const key = `${state.active.id}:${step.exIndex}:${step.setIndex}`;
  const owned = (ids) => ids.filter((id) => state.profile.bands.some((b) => b.id === id));
  if (ui.draft?.key === key) {
    ui.draft.bandIds = owned(ui.draft.bandIds); // a band may have been removed in Settings
    return ui.draft;
  }
  const entry = state.active.exercises[step.exIndex];
  const previous = entry.sets.at(-1);
  ui.draft = {
    key,
    reps: plannedReps(state.active, step),
    bandIds: owned(previous ? previous.bandIds : entry.target.bandIds),
    effort: null,
  };
  return ui.draft;
}

function latestSet() {
  return state.active.exercises.flatMap((e) => e.sets).sort((a, b) => a.at - b.at).at(-1) ?? null;
}

function finishWorkout() {
  const { state: next, workout } = finishSession(state, Date.now());
  commit(next);
  ui.draft = null;
  stopTempo();
  if (!workout) go('#/today');
  else if (state.profile.cooldowns && !workout.quick) startRoutine('cooldown', workout.id);
  else go(`#/summary/${encodeURIComponent(workout.id)}`);
}

function stopRestTimer() {
  clearInterval(restTimer);
  restTimer = null;
}

function tickRest() {
  const endsAt = state.active?.restEndsAt;
  if (!endsAt) return stopRestTimer();
  const left = endsAt - Date.now();
  if (left <= 0) {
    stopRestTimer();
    restEnded(state.profile);
    commit(skipRest(state));
    render();
    return undefined;
  }
  const seconds = Math.ceil(left / 1000);
  if (seconds === REST_WARNING_SECONDS && !ui.restWarned) {
    ui.restWarned = true;
    say(t('10 seconds'));
  }
  const count = document.getElementById('rest-count');
  const band = document.getElementById('rest-band');
  if (count && count.textContent !== String(seconds)) count.textContent = seconds;
  band?.style.setProperty('--p', Math.max(0, Math.min(1, left / restTotal)));
  return undefined;
}

function workoutHtml() {
  const step = currentStep(state.active);
  const { restEndsAt } = state.active;
  if (restEndsAt && restEndsAt > Date.now()) {
    const left = restEndsAt - Date.now();
    if (restTotal < left) restTotal = Math.max(left, state.active.range.rest * 1000);
    return restScreen({
      state,
      step,
      lastSet: latestSet(),
      seconds: Math.ceil(left / 1000),
      progress: Math.min(1, left / restTotal),
    });
  }
  if (restEndsAt) commit(skipRest(state));
  const entry = state.active.exercises[step.exIndex];
  const taken = new Set(state.active.exercises.map((e) => e.exerciseId));
  const swaps = swapOptions(entry.exerciseId, state.profile).filter((e) => !taken.has(e.id));
  return setScreen({
    state,
    step,
    draft: draftFor(step),
    swaps,
    canSpeak: canSpeak(),
  });
}

function announceSet() {
  const step = currentStep(state.active);
  const key = `${state.active.id}:${step.exIndex}:${step.setIndex}`;
  if (ui.announced === key) return;
  ui.announced = key;
  const entry = state.active.exercises[step.exIndex];
  const exercise = exerciseById(entry.exerciseId);
  say(setAnnouncement({
    name: exercise.name,
    setNumber: step.setIndex + 1,
    totalSets: entry.targetSets,
    reps: ui.draft.reps,
    band: labelFor(ui.draft.bandIds, state.profile.bands),
    perSide: exercise.perSide,
    timed: exercise.timed,
  }));
}

function applyDraftToScreen() {
  const reps = document.getElementById('reps-value');
  if (reps) reps.textContent = ui.draft.reps;
  const { band, on } = fieldColors(ui.draft.bandIds, state.profile.bands);
  const work = document.getElementById('work');
  work?.style.setProperty('--band', band);
  work?.style.setProperty('--on', on);
  const label = document.getElementById('band-label');
  if (label) label.textContent = labelFor(ui.draft.bandIds, state.profile.bands);
  document.querySelectorAll('[data-action="toggle-band"]').forEach((chip) => {
    chip.setAttribute('aria-pressed', ui.draft.bandIds.includes(chip.dataset.id));
  });
  document.querySelectorAll('[data-action="set-effort"]').forEach((choice) => {
    choice.setAttribute('aria-pressed', ui.draft.effort === choice.dataset.value);
  });
}

/* ---------- The rep count ---------- */

function tempoLabel() {
  const step = state.active && currentStep(state.active);
  const exercise = step && exerciseById(state.active.exercises[step.exIndex].exerciseId);
  return exercise?.timed ? t('Count seconds for me') : t('Count reps for me');
}

function stopTempo() {
  if (!tempo) return;
  clearInterval(tempo.timer);
  tempo = null;
  stopSpeaking();
}

function setTempoLabel(text) {
  const label = document.getElementById('tempo-label');
  if (label) label.textContent = text;
}

function setTempoText(text) {
  const box = document.getElementById('tempo-status');
  if (!box) return;
  box.textContent = text;
  box.hidden = !text;
}

function finishTempo(reps, message) {
  stopTempo();
  if (reps > 0) ui.draft.reps = reps;
  applyDraftToScreen();
  setTempoLabel(tempoLabel());
  setTempoText(message);
  say(message);
}

function tickTempo() {
  if (!tempo) return;
  const now = tempoAt(Date.now() - tempo.startedAt, tempo.options);
  tempo.latest = now;
  const key = `${now.phase}:${now.side}:${now.rep}`;
  if (key === tempo.key) {
    if (now.phase === 'ready' || now.phase === 'switch') {
      setTempoText(`${now.phase === 'ready' ? t('Get ready') : t('Switch sides')}: ${now.secondsLeft}`);
    }
    return;
  }
  tempo.key = key;

  const reps = document.getElementById('reps-value');
  if (reps && now.phase !== 'done') reps.textContent = now.completed;

  if (now.phase === 'done') {
    const { onDone, options: { reps: planned } } = tempo;
    if (onDone) {
      stopTempo();
      onDone(planned);
      return;
    }
    finishTempo(planned, t('Done. Log your set.'));
    return;
  }
  if (now.phase === 'ready') say(t('Get ready'));
  if (now.phase === 'switch') say(t('Switch sides'));
  if (now.phase === 'up' || now.phase === 'down') {
    if (state.profile.sound) tempoBeep(now.phase === 'up');
    if (now.phase === 'up') say(String(now.rep));
    setTempoText(t('Rep {n}: {direction}', { n: now.rep, direction: now.phase === 'up' ? t('work') : t('return slowly') }));
  }
}

function startTempo({ leadInSeconds, onDone } = {}) {
  unlockSound();
  const step = currentStep(state.active);
  const exercise = exerciseById(state.active.exercises[step.exIndex].exerciseId);
  let speed = TEMPOS[state.profile.tempo] ?? TEMPOS.steady;
  if (state.active.method === 'negative') speed = TEMPOS.negative;
  if (exercise.timed) speed = HOLD_TEMPO;
  tempo = {
    startedAt: Date.now(),
    options: { reps: ui.draft.reps, upSeconds: speed.up, downSeconds: speed.down, perSide: exercise.perSide, leadInSeconds },
    onDone,
    key: null,
    latest: null,
    timer: setInterval(tickTempo, 100),
  };
  setTempoLabel(t('Stop counting'));
  tickTempo();
}

/* ---------- Dialogs ---------- */

/** Something else has taken over the screen, so the count ends here and nothing more is said. */
function interruptCount() {
  if (tempo && !tempo.onDone) finishTempo(0, '');
  else stopSpeaking();
}

function openDialog({ title, body, actions: buttons }) {
  interruptCount();
  const dialog = document.createElement('dialog');
  const heading = document.createElement('h2');
  heading.textContent = title;
  dialog.append(heading);
  if (body) {
    const p = document.createElement('p');
    p.textContent = body;
    dialog.append(p);
  }
  const row = document.createElement('div');
  row.className = 'dialog-actions';
  for (const action of buttons) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = action.kind ?? 'secondary';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      dialog.close();
      action.run?.();
    });
    row.append(button);
  }
  dialog.append(row);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}

/** Opens the camera coach, or explains why it cannot run here. Returns whether it opened. */
const CUE_SPEECH_MS = 3500;

/** The set in progress, in the words hands-free mode needs. Null once the workout has ended. */
function handsFreeView() {
  const { active, profile } = state;
  const step = active && currentStep(active);
  if (!step) return null;
  const entry = active.exercises[step.exIndex];
  const exercise = exerciseById(entry.exerciseId);
  const draft = draftFor(step);
  const restLeft = active.restEndsAt ? active.restEndsAt - Date.now() : 0;
  const colors = fieldColors(draft.bandIds, profile.bands);
  return {
    step,
    exercise,
    target: draft.reps,
    slowNegatives: active.method === 'negative',
    resting: restLeft > 0,
    restSeconds: Math.max(0, Math.ceil(restLeft / 1000)),
    setText: setOfText(active, step.setIndex + 1, entry.targetSets),
    goal: goalText(exercise, active, step, entry),
    bandText: exercise.bodyweight ? t('No band needed') : labelFor(draft.bandIds, profile.bands),
    bandColor: colors.band,
    bandOn: colors.on,
  };
}

const saveCameraView = (view) => editProfile((profile) => { profile.cameraView = view; });

async function startHandsFree() {
  const usable = (window.isSecureContext || isNative()) && navigator.mediaDevices?.getUserMedia;
  if (!usable) {
    openDialog({
      title: t('Hands-free'),
      body: t('The camera only works in the Android app or at a secure address, because browsers block it anywhere else.'),
      actions: [{ label: t('Keep going'), kind: 'primary' }],
    });
    return;
  }
  const { openHandsFree } = await import('./ui/handsfree.js');
  unlockSound();
  stopTempo();
  ui.handsFree = true;
  openHandsFree({
    view: handsFreeView,
    finishSet: (reps) => {
      ui.draft.reps = Math.min(REP_LIMIT, reps);
      actions['done-set']();
    },
    skipRest: () => actions['skip-rest'](),
    countAlong: (onDone) => startTempo({ leadInSeconds: 0, onDone }),
    stopCounting: stopTempo,
    say,
    beep: () => { if (state.profile.sound) tempoBeep(true); },
    announce: () => {
      if (state.active?.restEndsAt) return;
      ui.announced = null;
      announceSet();
    },
    cameraView: state.profile.cameraView,
    onCameraView: saveCameraView,
    onClose: () => {
      ui.handsFree = false;
      stopSpeaking();
      if (!handsFreeView()) speak(t('Workout finished. Well done.'), state.profile.voiceURI);
      if (parseRoute().name === 'workout') render();
    },
  });
}

async function startCamera(exercise, { onClose, ...callbacks }) {
  interruptCount();
  const usable = (window.isSecureContext || isNative()) && navigator.mediaDevices?.getUserMedia;
  if (!usable) {
    openDialog({
      title: t('Camera coach'),
      body: t('The camera only works in the Android app or at a secure address, because browsers block it anywhere else.'),
      actions: [{ label: t('Keep going'), kind: 'primary' }],
    });
    return;
  }
  if (!supportsRepCount(exercise)) {
    openDialog({
      title: t('Camera coach'),
      body: t('Camera coach cannot follow {name} yet, because the movement is too small or hidden from the camera. It works on most other exercises, such as squats, curls and rows.', { name: t(exercise.name) }),
      actions: [{ label: t('Keep going'), kind: 'primary' }],
    });
    return;
  }
  const { openCamera } = await import('./ui/camera.js');
  unlockSound();
  let cueUntil = 0;
  openCamera({
    exercise,
    slowNegatives: state.active?.method === 'negative',
    onCount: (count) => {
      if (state.profile.sound) tempoBeep(true);
      if (performance.now() >= cueUntil) say(String(count)); // never talk over a correction
    },
    // Spoken even with Voice off: from across the room, this is the only way to hear a correction.
    onCue: (text) => { cueUntil = performance.now() + CUE_SPEECH_MS; speak(text, state.profile.voiceURI); },
    colors: fieldColors(ui.draft?.bandIds ?? [], state.profile.bands),
    view: state.profile.cameraView,
    onViewChange: saveCameraView,
    ...callbacks,
    onClose: () => {
      stopSpeaking();
      onClose?.();
    },
  });
}

function setOwnVideo(exerciseId, id) {
  editProfile((profile) => {
    if (id) profile.videoOverrides[exerciseId] = id;
    else delete profile.videoOverrides[exerciseId];
  });
  ui.reopenHow = true;
  render();
}

function openOwnVideoDialog(exerciseId) {
  const dialog = document.createElement('dialog');
  const heading = document.createElement('h2');
  heading.textContent = t('Use my own video');
  const label = document.createElement('label');
  label.className = 'select-field';
  label.textContent = t('Paste a YouTube link');
  const input = document.createElement('input');
  input.type = 'url';
  input.id = 'own-video';
  input.autocomplete = 'off';
  label.append(input);
  const problem = document.createElement('p');
  problem.className = 'message error';
  problem.hidden = true;
  const row = document.createElement('div');
  row.className = 'dialog-actions';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'primary';
  save.textContent = t('Save video');
  save.addEventListener('click', () => {
    const id = parseYouTubeId(input.value);
    if (!id) {
      problem.textContent = t('That is not a YouTube video link.');
      problem.hidden = false;
      return;
    }
    dialog.close();
    setOwnVideo(exerciseId, id);
  });
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'text-button';
  cancel.textContent = t('Cancel');
  cancel.addEventListener('click', () => dialog.close());
  row.append(save, cancel);
  dialog.append(heading, label, problem, row);
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

function videoFrame(name, src) {
  const frame = document.createElement('iframe');
  frame.className = 'video-player';
  frame.title = t('Video: {name}', { name });
  frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin'; // YouTube refuses to play without this
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox');
  frame.src = src;
  return frame;
}

function showOffline(status) {
  status.textContent = t('Video needs an internet connection. The animated figure works offline.');
  status.hidden = false;
}

function playVideo(button) {
  interruptCount();
  const box = button.closest('.video');
  const status = box.querySelector('.video-status');
  if (!navigator.onLine) {
    showOffline(status);
    return;
  }
  const { exercise: exerciseId } = box.dataset;
  const video = videoFor(exerciseId, state.profile);
  if (!video) return;
  status.hidden = true;
  button.replaceWith(videoFrame(t(exerciseById(exerciseId).name), embedUrl(video.id, video.at)));
}

/** Plays a special inside its own card, from the chosen moment. */
function playSpecial(button) {
  const card = button.closest('.special-card');
  const status = card.querySelector('.video-status');
  if (!navigator.onLine) {
    showOffline(status);
    return;
  }
  const { video, at, title } = button.dataset;
  const player = card.querySelector('[data-player]');
  status.hidden = true;
  player.replaceChildren(videoFrame(title, embedUrl(video, Number(at))));
  player.scrollIntoView({ block: 'nearest' });
}

function openSwapDialog(exIndex) {
  interruptCount();
  const entry = state.active.exercises[exIndex];
  const taken = new Set(state.active.exercises.map((e) => e.exerciseId));
  const options = swapOptions(entry.exerciseId, state.profile).filter((e) => !taken.has(e.id));
  openDialog({
    title: t('Swap {name}', { name: t(exerciseById(entry.exerciseId).name) }),
    body: state.active.custom ? '' : t('Your plan keeps the new exercise from now on.'),
    actions: [
      ...options.map((o) => ({
        label: t(o.name),
        run: () => {
          commit(swapInSession(state, exIndex, o.id));
          ui.draft = null;
          render();
        },
      })),
      { label: t('Keep this exercise'), kind: 'text-button' },
    ],
  });
}

/* ---------- Actions ---------- */

async function downloadBackup() {
  const filename = `tensile-backup-${new Date().toISOString().slice(0, 10)}.json`;
  try {
    await saveTextFile(filename, makeBackup(state), 'application/json');
    ui.dataMessage = { kind: 'ok', text: isNative() ? t('Backup ready: {file}.', { file: filename }) : t('Saved {file} to your downloads.', { file: filename }) };
  } catch {
    // Closing Android's share sheet without choosing also lands here.
    ui.dataMessage = { kind: 'error', text: t('The backup was not saved. Try again if you still need it.') };
  }
  render();
}

function showReminderMessage(text, kind = 'error') {
  const box = document.getElementById('reminder-message');
  if (!box) return;
  box.textContent = text;
  box.className = `message ${kind}`;
  box.hidden = !text;
}

function syncNativeReminders() {
  if (!isNative()) return;
  const { days, exact: wantedExact } = state.profile.reminders;
  applyNativeReminders(state.profile.reminders)
    .then(({ allowed, exact }) => {
      if (!allowed) {
        showReminderMessage(t('Notifications are off for Tensile. Allow them in your phone settings to get reminders.'));
        return;
      }
      if (wantedExact && !exact && days.length) {
        editProfile((profile) => { profile.reminders.exact = false; }); // do not ask again on every change
        showReminderMessage(t('Exact timing is off, so a reminder may come some minutes late.'), 'ok');
        return;
      }
      showReminderMessage(days.length ? t('Reminders are set.') : '', 'ok');
    })
    .catch(() => showReminderMessage(t('Reminders could not be set on this phone.')));
}

async function importBackup(input) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = file.size > MAX_BACKUP_BYTES ? ' '.repeat(MAX_BACKUP_BYTES + 1) : await file.text();
    input.value = ''; // so the same file can be picked again
    const restored = parseBackup(text);
    openDialog({
      title: t('Restore this backup?'),
      body: t('This replaces everything on this device, including {current} logged workouts, with {incoming} workouts from the backup.', { current: state.workouts.length, incoming: restored.workouts.length }),
      actions: [
        {
          label: t('Replace and restore'),
          kind: 'primary',
          run: () => {
            commit(restored);
            syncNativeReminders();
            ui.message = { kind: 'ok', text: t('Backup restored.') };
            go('#/today');
          },
        },
        { label: t('Keep current data'), kind: 'text-button' },
      ],
    });
  } catch (err) {
    ui.dataMessage = { kind: 'error', text: t(err.message) };
    render();
  }
}

function builderWorkout() {
  return state.profile.customWorkouts.find((w) => w.id === parseRoute().arg);
}

function editBuilderWorkout(change) {
  const { arg } = parseRoute();
  editProfile((profile) => {
    const workout = profile.customWorkouts.find((w) => w.id === arg);
    if (workout) change(workout);
  });
}

function moveExercise(index, by) {
  editBuilderWorkout((workout) => {
    const list = workout.exerciseIds;
    const to = index + by;
    if (to < 0 || to >= list.length) return;
    [list[index], list[to]] = [list[to], list[index]];
  });
  render();
}

const actions = {
  'finish-setup': () => {
    editProfile((profile) => {
      profile.onboarded = true;
      profile.program = { id: 'auto', startedAt: Date.now() }; // the short and long term plan starts straight away
    });
    lastRoute = null; // setup and Today share an address, so this makes Today open at the top
    navigator.storage?.persist?.().catch(() => {});
    go('#/today');
  },
  'add-band': () => {
    const next = structuredClone(state);
    const used = new Set(next.profile.bands.map((b) => b.color));
    const colour = BAND_COLORS.find((c) => !used.has(c.hex)) ?? BAND_COLORS[0];
    const heaviest = Math.max(0, ...next.profile.bands.map((b) => b.kg));
    const band = newBand(colour.name, colour.hex, heaviest + 5);
    next.profile.bands.push(band);
    commit(next);
    render();
    document.getElementById(`band-name-${band.id}`)?.focus();
  },
  'remove-band': (el) => {
    const next = structuredClone(state);
    if (next.profile.bands.length === 1) return;
    next.profile.bands = next.profile.bands.filter((b) => b.id !== el.dataset.id);
    commit(next);
    render();
  },
  'bands-standard': () => {
    editProfile((profile) => {
      for (const band of profile.bands) {
        if (STANDARD_TENSIONS[band.name]) band.kg = STANDARD_TENSIONS[band.name];
      }
    });
    ui.message = { kind: 'ok', text: t('Band tensions updated.') };
    render();
  },
  'start-workout': (el, event) => {
    event.preventDefault();
    beginSession();
  },
  'start-quick': () => beginSession({ quick: true }),
  'resume-workout': () => unlockSound(),
  'skip-lighter': () => {
    editProfile((profile) => { profile.lighterSkippedAt = Date.now(); });
    render();
  },
  'routine-next': () => nextMove(),
  'routine-skip': () => endRoutine(),
  'reps-up': () => {
    ui.draft.reps = Math.min(REP_LIMIT, ui.draft.reps + 1);
    applyDraftToScreen();
  },
  'reps-down': () => {
    ui.draft.reps = Math.max(0, ui.draft.reps - 1);
    applyDraftToScreen();
  },
  'toggle-band': (el) => {
    const { id } = el.dataset;
    const { bandIds } = ui.draft;
    ui.draft.bandIds = bandIds.includes(id) ? bandIds.filter((b) => b !== id) : [...bandIds, id];
    applyDraftToScreen();
  },
  'set-effort': (el) => {
    ui.draft.effort = ui.draft.effort === el.dataset.value ? null : el.dataset.value;
    applyDraftToScreen();
  },
  'tempo-toggle': () => {
    if (!tempo) {
      startTempo();
      return;
    }
    const counted = tempo.latest?.completed ?? 0;
    finishTempo(counted, '');
  },
  'voice-toggle': (el) => {
    editProfile((profile) => { profile.voice = !profile.voice; });
    el.setAttribute('aria-checked', String(state.profile.voice));
    if (state.profile.voice) {
      ui.announced = null;
      announceSet();
    } else {
      stopSpeaking();
    }
  },
  'voice-hear': (el) => speak(voiceSample(), el.dataset.uri || null),
  'hands-free': () => startHandsFree(),
  'camera-open': () => {
    const step = currentStep(state.active);
    startCamera(exerciseById(state.active.exercises[step.exIndex].exerciseId), {
      onUse: (count) => {
        if (count > 0) ui.draft.reps = Math.min(REP_LIMIT, count); // nothing counted keeps the planned reps
        applyDraftToScreen();
      },
    });
  },
  'camera-practice': (el) => {
    keepScreenOn(true);
    startCamera(exerciseById(el.dataset.id), { onClose: () => keepScreenOn(false) });
  },
  'done-set': () => {
    unlockSound();
    stopTempo();
    const before = Date.now();
    commit(logSet(state, { reps: ui.draft.reps, bandIds: ui.draft.bandIds, effort: ui.draft.effort }, before));
    const step = currentStep(state.active);
    if (!step) return finishWorkout();
    restTotal = state.active.range.rest * 1000;
    ui.restWarned = false;
    const rests = Boolean(state.active.restEndsAt); // a circuit goes straight to the next exercise
    render();
    if (rests) say(restAnnouncement({
      seconds: state.active.range.rest,
      nextName: exerciseById(state.active.exercises[step.exIndex].exerciseId).name,
      isNewExercise: step.setIndex === 0,
    }));
    return undefined;
  },
  'add-rest': () => {
    commit(addRest(state, 15));
    const left = state.active.restEndsAt - Date.now();
    restTotal = Math.max(restTotal, left);
    ui.restWarned = false;
    tickRest();
  },
  'skip-rest': () => {
    commit(skipRest(state));
    render();
  },
  'undo-set': () => {
    const { state: next, undone } = undoLastSet(state);
    commit(next);
    if (undone) {
      const step = currentStep(next.active);
      ui.draft = {
        key: `${next.active.id}:${step.exIndex}:${step.setIndex}`,
        reps: undone.reps,
        bandIds: undone.bandIds.filter((id) => next.profile.bands.some((b) => b.id === id)),
        effort: undone.effort ?? null,
      };
    }
    render();
  },
  'skip-exercise': () => {
    const step = currentStep(state.active);
    const name = t(exerciseById(state.active.exercises[step.exIndex].exerciseId).name);
    openDialog({
      title: t('Skip {name}?', { name }),
      body: t('Any sets you logged for it stay saved.'),
      actions: [
        {
          label: t('Skip exercise'),
          kind: 'primary',
          run: () => {
            commit(skipExercise(state, step.exIndex));
            if (!currentStep(state.active)) return finishWorkout();
            render();
            return undefined;
          },
        },
        { label: t('Keep going'), kind: 'text-button' },
      ],
    });
  },
  'open-swap': () => openSwapDialog(currentStep(state.active).exIndex),
  'end-workout': () => {
    const logged = state.active.exercises.some((e) => e.sets.length);
    const discard = () => {
      const next = structuredClone(state);
      next.active = null;
      commit(next);
      ui.draft = null;
      go('#/today');
    };
    openDialog({
      title: t('End this workout?'),
      body: logged ? t('Save what you have logged, or discard the whole workout.') : t('No sets are logged yet, so nothing will be saved.'),
      actions: [
        ...(logged ? [{ label: t('Save and finish'), kind: 'primary', run: finishWorkout }] : []),
        { label: logged ? t('Discard workout') : t('End workout'), kind: 'secondary', run: discard },
        { label: t('Keep going'), kind: 'text-button' },
      ],
    });
  },
  'go-back': (el, event) => {
    event.preventDefault();
    if (history.length > 1) history.back();
    else go('#/exercises');
  },
  'chart-point': (el) => {
    ui.chartPoint = Number(el.dataset.i);
    render();
  },
  'delete-workout': (el) => {
    const target = state.workouts.find((w) => w.id === el.dataset.id);
    if (!target) return;
    openDialog({
      title: t('Delete {name}?', { name: t(target.name) }),
      body: t('This removes the workout from your history and charts. It cannot be undone.'),
      actions: [
        {
          label: t('Delete workout'),
          kind: 'primary',
          run: () => {
            const next = structuredClone(state);
            next.workouts = next.workouts.filter((w) => w.id !== target.id);
            commit(next);
            ui.chartPoint = null;
            render();
          },
        },
        { label: t('Keep it'), kind: 'text-button' },
      ],
    });
  },

  /* Videos */
  'video-play': (el) => playVideo(el),
  'special-play': (el) => playSpecial(el),
  'video-own': (el) => openOwnVideoDialog(el.closest('.video').dataset.exercise),
  'video-reset': (el) => setOwnVideo(el.closest('.video').dataset.exercise, null),

  /* Band care */
  'band-checked': (el) => {
    editProfile((profile) => {
      const band = profile.bands.find((b) => b.id === el.dataset.id);
      if (band) band.inspectedAt = Date.now();
    });
    render();
  },
  'band-replaced': (el) => {
    const target = state.profile.bands.find((b) => b.id === el.dataset.id);
    if (!target) return;
    openDialog({
      title: t('Replaced {band}?', { band: bandName(target.name) }),
      body: t('This restarts its age and safety checks. Your old workouts stay as they are.'),
      actions: [
        {
          label: t('Yes, it is a new band'),
          kind: 'primary',
          run: () => {
            editProfile((profile) => {
              const band = profile.bands.find((b) => b.id === target.id);
              const now = Date.now();
              band.addedAt = now;
              band.inspectedAt = now;
              delete band.measuredAt;
            });
            render();
          },
        },
        { label: t('Cancel'), kind: 'text-button' },
      ],
    });
  },
  'measure-save': (el) => {
    const { unit } = state.profile;
    const readings = [...document.querySelectorAll('[data-reading]')].map((box) => (box.value === '' ? 0 : fromUnit(Number(box.value), unit)));
    const summary = summariseReadings(readings);
    if (!summary) {
      showFormMessage(t('Enter at least one reading above 0.'));
      return;
    }
    let name = '';
    editProfile((profile) => {
      const band = profile.bands.find((b) => b.id === el.dataset.id);
      band.kg = summary.kg;
      band.measuredAt = Date.now();
      name = bandName(band.name);
    });
    const saved = t('{band} now reads {load}.', { band: name, load: formatLoad(summary.kg, unit) });
    ui.message = {
      kind: summary.steady ? 'ok' : 'error',
      text: summary.steady ? saved : `${saved} ${t('Your readings were far apart, so measure again if you can.')}`,
    };
    go('#/bands');
  },

  /* Programs */
  'program-start': (el) => {
    editProfile((profile) => { profile.program = { id: el.dataset.id, startedAt: Date.now() }; });
    go('#/today');
  },
  'track-start': (el) => {
    editProfile((profile) => { profile.program = { id: TRACK_ID, startedAt: trackStartFor(Number(el.dataset.week), weekStart(Date.now())) }; });
    go('#/today');
  },
  'program-stop': () => {
    openDialog({
      title: t('Stop this program?'),
      body: t('Your workouts stay saved, and your own goal applies again.'),
      actions: [
        {
          label: t('Stop program'),
          kind: 'primary',
          run: () => {
            editProfile((profile) => { profile.program = null; });
            render();
          },
        },
        { label: t('Keep going'), kind: 'text-button' },
      ],
    });
  },

  /* Workout builder */
  'custom-new': () => {
    const id = newId('custom');
    editProfile((profile) => {
      profile.customWorkouts.push({ id, name: t('My workout'), exerciseIds: [], sets: 3 });
    });
    go(`#/builder/${encodeURIComponent(id)}`);
  },
  'custom-start': (el) => {
    if (state.active) {
      openDialog({
        title: t('A workout is in progress'),
        body: t('Finish or end it first, then start this one.'),
        actions: [{ label: t('Resume workout'), kind: 'primary', run: () => go('#/workout') }, { label: t('Cancel'), kind: 'text-button' }],
      });
      return;
    }
    beginSession({ customId: el.dataset.id });
  },
  'custom-up': (el) => moveExercise(Number(el.dataset.i), -1),
  'custom-down': (el) => moveExercise(Number(el.dataset.i), 1),
  'custom-remove': (el) => {
    editBuilderWorkout((workout) => workout.exerciseIds.splice(Number(el.dataset.i), 1));
    render();
  },
  'custom-add': () => {
    const { value } = document.getElementById('custom-add');
    if (value) editBuilderWorkout((workout) => workout.exerciseIds.push(value));
    render();
  },
  'custom-delete': () => {
    const target = builderWorkout();
    if (!target) return;
    openDialog({
      title: t('Delete {name}?', { name: target.name }),
      body: t('Workouts you already logged stay in your history.'),
      actions: [
        {
          label: t('Delete this workout'),
          kind: 'primary',
          run: () => {
            editProfile((profile) => {
              profile.customWorkouts = profile.customWorkouts.filter((w) => w.id !== target.id);
              if (!profile.customWorkouts.length) profile.useCustomPlan = false;
            });
            go('#/builder');
          },
        },
        { label: t('Keep it'), kind: 'text-button' },
      ],
    });
  },

  /* Reminders */
  'reminder-exact': () => {
    editProfile((profile) => { profile.reminders.exact = true; });
    syncNativeReminders();
  },
  'reminder-calendar': async () => {
    const ics = buildIcs(state.profile.reminders, Date.now());
    if (!ics) return;
    await saveTextFile('tensile-reminders.ics', ics, 'text/calendar');
    showReminderMessage(t('Open the downloaded file to add the reminders to your calendar.'), 'ok');
  },

  export: downloadBackup,
  install: async () => {
    const prompt = ui.installPrompt;
    ui.installPrompt = null;
    await prompt?.prompt();
    render();
  },
  reset: () => {
    openDialog({
      title: t('Erase everything?'),
      body: t('This permanently deletes {count} logged workouts and your band setup from this device. Save a backup first if you may want them.', { count: state.workouts.length }),
      actions: [
        {
          label: t('Erase everything'),
          kind: 'primary',
          run: () => {
            commit(defaultState());
            syncNativeReminders();
            ui.draft = null;
            go('#/today');
          },
        },
        { label: t('Keep my data'), kind: 'text-button' },
      ],
    });
  },
};

// Form fields update in place rather than re-rendering the page. A field saves
// when it loses focus, often because the person is tapping a button; replacing
// that button mid-tap would swallow the tap.

function showFormMessage(text, kind = 'error') {
  const box = document.getElementById('form-message');
  if (!box) return;
  box.textContent = text;
  box.className = `message ${kind}`;
  box.hidden = !text;
  if (text && kind === 'error') box.scrollIntoView({ block: 'nearest' }); // the field may be far below it
}

function updateProfileField(input) {
  const field = input.dataset.field;
  editProfile((profile) => {
    if (input.type === 'checkbox') profile[field] = input.checked;
    else if (field === 'language') profile.language = input.value || null;
    else if (field === 'voiceURI') profile.voiceURI = input.value || null;
    else if (field === 'rest') profile.rest = input.value === 'auto' ? 'auto' : Number(input.value);
    else profile[field] = ['daysPerWeek', 'minutes'].includes(field) ? Number(input.value) : input.value;
  });
  // These change text all over the screen, so they are worth the redraw.
  if (field === 'voiceURI') speak(voiceSample(), state.profile.voiceURI);
  if (field === 'language' || field === 'unit') render();
  else if (field === 'level') refreshStartingBands();
}

function refreshStartingBands() {
  const box = document.getElementById('level-bands');
  if (box) box.innerHTML = startingBands(state.profile);
}

function updateAvoid(input) {
  editProfile((profile) => {
    const others = profile.avoid.filter((area) => area !== input.dataset.avoid);
    profile.avoid = input.checked ? [...others, input.dataset.avoid] : others;
  });
}

function updateBandField(input) {
  const { id, bandField } = input.dataset;
  const next = structuredClone(state);
  const band = next.profile.bands.find((b) => b.id === id);
  if (!band) return;
  const { unit } = next.profile;
  showFormMessage('');
  if (bandField === 'kg') {
    const value = Number(input.value);
    if (input.value === '' || !Number.isFinite(value) || value <= 0) {
      input.value = toUnit(band.kg, unit);
      showFormMessage(t('Enter a tension above 0 for {band}. It stays at {load}.', { band: band.name, load: formatLoad(band.kg, unit) }));
      return;
    }
    band.kg = fromUnit(value, unit);
  } else if (bandField === 'color') {
    const previous = BAND_COLORS.find((c) => c.hex === band.color);
    const chosen = BAND_COLORS.find((c) => c.hex === input.value);
    if (!chosen) return;
    if (previous && band.name === previous.name) {
      band.name = chosen.name; // keep default names in step with the colour
      const nameInput = document.getElementById(`band-name-${band.id}`);
      if (nameInput) nameInput.value = band.name;
    }
    band.color = chosen.hex;
    const dot = input.closest('.band-row')?.querySelector('.dot');
    if (dot) dot.style.background = band.color;
  } else {
    band.name = input.value.trim() || band.name;
    input.value = band.name;
  }
  commit(next);
  refreshStartingBands();
}

function updateSchedule(input) {
  editProfile((profile) => {
    const { schedule } = profile;
    if (input.dataset.scheduleToggle !== undefined) {
      schedule.enabled = input.checked;
      if (input.checked && !Object.values(schedule.days).some(Boolean)) schedule.days = defaultWeek(profile);
    } else {
      schedule.days[input.dataset.scheduleDay] = input.value || null;
    }
  });
  render(); // the warnings and the fields both depend on the choice
}

function updateSetupField(input) {
  const step = currentStep(state.active);
  const key = input.dataset.setupField;
  const value = key === 'steps' && input.value !== '' ? Number(input.value) : input.value;
  commit(setEntrySetup(state, step.exIndex, key, value));
  const label = document.getElementById('setup-label');
  if (label) label.textContent = describeSetup(state.active.exercises[step.exIndex].setup);
}

function updateCustomField(input) {
  const field = input.dataset.customField;
  editBuilderWorkout((workout) => {
    if (field === 'sets') workout.sets = Number(input.value);
    else workout.name = input.value.trim() || workout.name;
  });
  const workout = builderWorkout();
  if (field === 'name' && workout) {
    input.value = workout.name;
    const title = root.querySelector('h1');
    if (title) title.textContent = workout.name;
  }
}

function updateReminders(input) {
  editProfile((profile) => {
    const { reminders } = profile;
    if (input.dataset.reminderDay !== undefined) {
      const day = Number(input.dataset.reminderDay);
      reminders.days = input.checked ? [...new Set([...reminders.days, day])] : reminders.days.filter((d) => d !== day);
    } else if (input.value) {
      reminders.time = input.value;
    }
  });
  root.querySelectorAll('[data-action="reminder-calendar"], [data-action="reminder-exact"]').forEach((button) => {
    button.disabled = !state.profile.reminders.days.length;
  });
  syncNativeReminders();
}

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (el && !el.disabled) actions[el.dataset.action]?.(el, event);
});

document.addEventListener('change', (event) => {
  const el = event.target;
  if (el.dataset.field) updateProfileField(el);
  else if (el.dataset.avoid) updateAvoid(el);
  else if (el.dataset.bandField) updateBandField(el);
  else if (el.dataset.setupField) updateSetupField(el);
  else if (el.dataset.scheduleToggle !== undefined || el.dataset.scheduleDay !== undefined) updateSchedule(el);
  else if (el.dataset.customField) updateCustomField(el);
  else if (el.dataset.reminderDay !== undefined || el.dataset.reminderTime !== undefined) updateReminders(el);
  else if (el.dataset.actionChange === 'import') importBackup(el);
  else if (el.dataset.fieldUi === 'chartExercise') {
    ui.chartExercise = el.value;
    ui.chartPoint = null;
    render();
  }
});

document.addEventListener('input', (event) => {
  if (event.target.dataset.fieldUi !== 'query') return;
  ui.query = event.target.value;
  const { selectionStart } = event.target;
  render();
  const search = document.getElementById('library-search');
  search?.focus();
  search?.setSelectionRange(selectionStart, selectionStart);
});

// Previewing a bar on hover, without losing the place in the page.
document.addEventListener('pointerover', (event) => {
  const bar = event.target.closest?.('.bar');
  if (!bar || event.pointerType !== 'mouse') return;
  const readout = document.querySelector('.readout');
  if (readout) readout.textContent = bar.getAttribute('aria-label');
});

/* ---------- Rendering ---------- */

function mountFigures() {
  document.querySelectorAll('[data-figure]').forEach((box) => {
    const exercise = exerciseById(box.dataset.figure);
    if (exercise) mountFigure(box, exercise);
  });
  const routineBox = document.querySelector('[data-routine-figure]');
  if (routineBox && ui.routine) mountFigure(routineBox, ui.routine.moves[ui.routine.index]);
}

const SETTINGS_ROUTES = new Set(['bands', 'programs', 'builder', 'schedule']);

function screenFor(route) {
  const now = Date.now();
  const tab = SETTINGS_ROUTES.has(route.name) ? 'settings' : route.name === 'summary' ? '' : route.name;
  const shell = (html) => `${ui.saveFailed ? `<p class="message error" role="alert">${t('Could not save. Your device storage may be full, so free some space and log the set again.')}</p>` : ''}${html}${credits()}${nav(tab)}`;

  if (!state.profile.onboarded) return `${setupScreen({ state, message: take('message') })}${credits()}`;

  switch (route.name) {
    case 'workout': {
      if (!state.active) return null;
      if (!currentStep(state.active)) {
        finishWorkout();
        return undefined;
      }
      return workoutHtml();
    }
    case 'routine':
      return routineHtml(route);
    case 'summary': {
      const workout = state.workouts.find((w) => w.id === route.arg);
      return workout ? shell(summaryScreen({ state, workout, now })) : null;
    }
    case 'progress':
      return shell(progressScreen({ state, now, chartExercise: ui.chartExercise, chartPoint: ui.chartPoint }));
    case 'exercises':
      if (route.arg) return exerciseById(route.arg) ? shell(exerciseScreen({ state, id: route.arg })) : null;
      return shell(libraryScreen({ state, query: ui.query }));
    case 'settings':
      return shell(settingsScreen({
        state,
        message: take('message'),
        dataMessage: take('dataMessage'),
        canInstall: Boolean(ui.installPrompt),
        secure: window.isSecureContext || isNative(),
        native: isNative(),
        voices: askForVoices(),
      }));
    case 'bands': {
      if (!route.arg) return shell(bandsScreen({ state, now, message: take('message') }));
      const band = state.profile.bands.find((b) => b.id === route.arg);
      return band ? shell(measureScreen({ state, band, message: take('message') })) : null;
    }
    case 'programs':
      return shell(programsScreen({ state, now }));
    case 'schedule':
      return shell(scheduleScreen({ state }));
    case 'guide':
      return shell(guideScreen());
    case 'specials':
      return shell(specialsScreen({ state, now }));
    case 'builder': {
      if (!route.arg) return shell(builderListScreen({ state }));
      const workout = builderWorkout();
      return workout ? shell(builderEditScreen({ state, workout, message: take('message') })) : null;
    }
    case 'today': {
      const preview = state.active ? null : startSession(state, now).active;
      return shell(todayScreen({ state, preview, now, message: take('message') }));
    }
    default:
      return null;
  }
}

/** The voices for the Settings list. Only the list changes when they arrive, so nothing being typed is lost. */
function askForVoices() {
  if (!ui.voicesAsked) {
    ui.voicesAsked = true;
    loadVoices().then((voices) => {
      ui.voices = voices;
      const box = document.getElementById('voice-picker');
      if (box) box.innerHTML = voicePicker(state.profile, voices);
    });
  }
  return ui.voices ?? null;
}

/** Speech and open dialogs belong to the screen being left, so they end with it. */
function leaveScreen() {
  stopSpeaking();
  document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
}

function render() {
  const route = parseRoute();
  const html = screenFor(route);
  if (html === undefined) return; // the screen already moved on
  if (html === null) {
    go('#/today');
    return;
  }

  const routeKey = `${route.name}/${route.arg ?? ''}`;
  const changedRoute = routeKey !== lastRoute;
  if (changedRoute) leaveScreen();
  const focusId = changedRoute ? null : document.activeElement?.id;
  const focusAction = changedRoute ? null : document.activeElement?.dataset?.action;

  stopFigures();
  stopRestTimer();
  stopTempo();
  clearInterval(routineTimer);
  routineTimer = null;
  root.innerHTML = `${html}${watermark()}`;
  mountFigures();
  if (take('reopenHow')) document.getElementById('how-details')?.setAttribute('open', '');

  const inWorkout = route.name === 'workout' && state.active;
  const inRoutine = route.name === 'routine' && ui.routine;
  keepScreenOn(Boolean(inWorkout || inRoutine));
  if (inWorkout && state.active.restEndsAt) restTimer = setInterval(tickRest, 200);
  else if (inWorkout) announceSet();
  if (inRoutine) {
    routineTimer = setInterval(tickRoutine, 200);
    if (ui.routine.spoken !== ui.routine.index) {
      ui.routine.spoken = ui.routine.index;
      const move = ui.routine.moves[ui.routine.index];
      say(`${t(move.name)}. ${t(move.cue)}`);
    }
  }

  if (changedRoute) {
    window.scrollTo(0, 0);
    root.querySelector('h1')?.focus({ preventScroll: true });
    if (route.name === 'specials' && route.arg) document.getElementById(route.arg)?.scrollIntoView();
  } else if (focusId) {
    document.getElementById(focusId)?.focus({ preventScroll: true });
  } else if (focusAction) {
    root.querySelector(`[data-action="${focusAction}"]`)?.focus({ preventScroll: true });
  }
  // On a long page a new message can land away from the button that caused it.
  if (!changedRoute) root.querySelector('.message[role="status"]:not([hidden])')?.scrollIntoView({ block: 'nearest' });
  lastRoute = routeKey;
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  ui.installPrompt = event;
  if (parseRoute().name === 'settings') render();
});
window.addEventListener('appinstalled', () => {
  ui.installPrompt = null;
});

function start() {
  window.addEventListener('hashchange', render);
  window.addEventListener('pagehide', stopSpeaking);
  // The Android app already holds its own files, so it needs no offline worker.
  if ('serviceWorker' in navigator && window.isSecureContext && !isNative()) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
    removeOldCopies(navigator.serviceWorker);
  }
  if (state.profile.voiceURI) loadVoices(); // ready for the first thing said
  render();
}

applyLanguage();
// Another site must not show this app inside its own page and trick people into tapping it.
// GitHub Pages cannot send the header that forbids this, so the app checks for itself.
if (window.top !== window.self) document.body.textContent = t('Tensile only opens in its own window.');
else start();
