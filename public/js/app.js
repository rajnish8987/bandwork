import { BAND_COLORS } from './core/color.js';
import { exerciseById } from './core/exercises.js';
import { swapOptions } from './core/plan.js';
import { labelFor } from './core/progression.js';
import {
  addRest, currentStep, finishSession, logSet, skipExercise, skipRest, startSession, swapInSession, undoLastSet,
} from './core/session.js';
import { defaultState, loadState, makeBackup, newBand, parseBackup, saveState } from './core/store.js';
import { keepScreenOn, restEnded, unlockSound } from './ui/feedback.js';
import { mountFigure, stopFigures } from './ui/figure.js';
import {
  exerciseScreen, libraryScreen, nav, progressScreen, settingsScreen, setupScreen, summaryScreen, todayScreen,
} from './ui/screens.js';
import { fieldColors, restScreen, setScreen } from './ui/workout-screens.js';

const root = document.getElementById('app');
const REP_LIMIT = 200;

let state = loadState(localStorage);
const ui = {
  draft: null,
  query: '',
  chartExercise: null,
  chartPoint: null,
  message: null,
  installPrompt: null,
  saveFailed: false,
};
let restTimer = null;
let restTotal = 0;
let lastRoute = null;

function commit(next) {
  state = next;
  ui.saveFailed = !saveState(localStorage, state);
}

function parseRoute() {
  const [name = 'today', arg] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: name || 'today', arg: arg && decodeURIComponent(arg) };
}

const go = (hash) => {
  if (location.hash === hash) render();
  else location.hash = hash;
};

function take(key) {
  const value = ui[key];
  ui[key] = null;
  return value;
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
    reps: entry.target.repsGoal,
    bandIds: owned(previous ? previous.bandIds : entry.target.bandIds),
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
  go(workout ? `#/summary/${encodeURIComponent(workout.id)}` : '#/today');
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
  return setScreen({ state, step, draft: draftFor(step), swaps });
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
}

/* ---------- Dialogs ---------- */

function openDialog({ title, body, actions }) {
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
  for (const action of actions) {
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

function openSwapDialog(exIndex) {
  const entry = state.active.exercises[exIndex];
  const taken = new Set(state.active.exercises.map((e) => e.exerciseId));
  const options = swapOptions(entry.exerciseId, state.profile).filter((e) => !taken.has(e.id));
  openDialog({
    title: `Swap ${exerciseById(entry.exerciseId).name}`,
    body: 'Your plan keeps the new exercise from now on.',
    actions: [
      ...options.map((o) => ({
        label: o.name,
        run: () => {
          commit(swapInSession(state, exIndex, o.id));
          ui.draft = null;
          render();
        },
      })),
      { label: 'Keep this exercise', kind: 'text-button' },
    ],
  });
}

/* ---------- Actions ---------- */

function downloadBackup() {
  const blob = new Blob([makeBackup(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bandwork-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  ui.message = { kind: 'ok', text: `Saved ${link.download} to your downloads.` };
  render();
}

async function importBackup(input) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    input.value = ''; // so the same file can be picked again
    const restored = parseBackup(text);
    openDialog({
      title: 'Restore this backup?',
      body: `This replaces everything on this device, including ${state.workouts.length} logged workouts, with ${restored.workouts.length} workouts from the backup.`,
      actions: [
        {
          label: 'Replace and restore',
          kind: 'primary',
          run: () => {
            commit(restored);
            ui.message = { kind: 'ok', text: 'Backup restored.' };
            go('#/today');
          },
        },
        { label: 'Keep current data', kind: 'text-button' },
      ],
    });
  } catch (err) {
    ui.message = { kind: 'error', text: err.message };
    render();
  }
}

const actions = {
  'finish-setup': () => {
    const next = structuredClone(state);
    next.profile.onboarded = true;
    commit(next);
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
  'start-workout': (el, event) => {
    event.preventDefault();
    unlockSound();
    commit(startSession(state, Date.now()));
    go('#/workout');
  },
  'resume-workout': () => unlockSound(),
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
  'done-set': () => {
    unlockSound();
    const before = Date.now();
    commit(logSet(state, { reps: ui.draft.reps, bandIds: ui.draft.bandIds }, before));
    if (!currentStep(state.active)) return finishWorkout();
    restTotal = state.active.range.rest * 1000;
    render();
    return undefined;
  },
  'add-rest': () => {
    commit(addRest(state, 15));
    const left = state.active.restEndsAt - Date.now();
    restTotal = Math.max(restTotal, left);
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
      };
    }
    render();
  },
  'skip-exercise': () => {
    const step = currentStep(state.active);
    const name = exerciseById(state.active.exercises[step.exIndex].exerciseId).name;
    openDialog({
      title: `Skip ${name}?`,
      body: 'Any sets you logged for it stay saved.',
      actions: [
        {
          label: 'Skip exercise',
          kind: 'primary',
          run: () => {
            commit(skipExercise(state, step.exIndex));
            if (!currentStep(state.active)) return finishWorkout();
            render();
            return undefined;
          },
        },
        { label: 'Keep going', kind: 'text-button' },
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
      title: 'End this workout?',
      body: logged ? 'Save what you have logged, or discard the whole workout.' : 'No sets are logged yet, so nothing will be saved.',
      actions: [
        ...(logged ? [{ label: 'Save and finish', kind: 'primary', run: finishWorkout }] : []),
        { label: logged ? 'Discard workout' : 'End workout', kind: 'secondary', run: discard },
        { label: 'Keep going', kind: 'text-button' },
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
      title: `Delete ${target.name}?`,
      body: 'This removes the workout from your history and charts. It cannot be undone.',
      actions: [
        {
          label: 'Delete workout',
          kind: 'primary',
          run: () => {
            const next = structuredClone(state);
            next.workouts = next.workouts.filter((w) => w.id !== target.id);
            commit(next);
            ui.chartPoint = null;
            render();
          },
        },
        { label: 'Keep it', kind: 'text-button' },
      ],
    });
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
      title: 'Erase everything?',
      body: `This permanently deletes ${state.workouts.length} logged workouts and your band setup from this device. Save a backup first if you may want them.`,
      actions: [
        {
          label: 'Erase everything',
          kind: 'primary',
          run: () => {
            commit(defaultState());
            ui.draft = null;
            go('#/today');
          },
        },
        { label: 'Keep my data', kind: 'text-button' },
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
}

function updateProfileField(input) {
  const field = input.dataset.field;
  const next = structuredClone(state);
  if (input.type === 'checkbox') next.profile[field] = input.checked;
  else next.profile[field] = ['daysPerWeek', 'minutes'].includes(field) ? Number(input.value) : input.value;
  commit(next);
}

function updateBandField(input) {
  const { id, bandField } = input.dataset;
  const next = structuredClone(state);
  const band = next.profile.bands.find((b) => b.id === id);
  if (!band) return;
  showFormMessage('');
  if (bandField === 'kg') {
    const kg = Number(input.value);
    if (input.value === '' || !Number.isFinite(kg) || kg <= 0) {
      input.value = band.kg;
      showFormMessage(`Enter a tension above 0 for ${band.name}. It stays at ${band.kg} kg.`);
      return;
    }
    band.kg = kg;
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
}

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (el && !el.disabled) actions[el.dataset.action]?.(el, event);
});

document.addEventListener('change', (event) => {
  const el = event.target;
  if (el.dataset.field) updateProfileField(el);
  else if (el.dataset.bandField) updateBandField(el);
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
}

function screenFor(route) {
  const now = Date.now();
  const shell = (html) => `${ui.saveFailed ? '<p class="message error" role="alert">Could not save. Your device storage may be full, so free some space and log the set again.</p>' : ''}${html}${nav(route.name === 'summary' ? '' : route.name)}`;

  if (!state.profile.onboarded) return setupScreen({ state, message: take('message') });

  switch (route.name) {
    case 'workout': {
      if (!state.active) return null;
      if (!currentStep(state.active)) {
        finishWorkout();
        return undefined;
      }
      return workoutHtml();
    }
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
      return shell(settingsScreen({ state, message: take('message'), canInstall: Boolean(ui.installPrompt), secure: window.isSecureContext }));
    case 'today': {
      const preview = state.active ? null : startSession(state, now).active;
      return shell(todayScreen({ state, preview, now, message: take('message') }));
    }
    default:
      return null;
  }
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
  const focusId = changedRoute ? null : document.activeElement?.id;
  const focusAction = changedRoute ? null : document.activeElement?.dataset?.action;

  stopFigures();
  stopRestTimer();
  root.innerHTML = html;
  mountFigures();

  const inWorkout = route.name === 'workout' && state.active;
  keepScreenOn(Boolean(inWorkout));
  if (inWorkout && state.active.restEndsAt) restTimer = setInterval(tickRest, 200);

  if (changedRoute) {
    window.scrollTo(0, 0);
    root.querySelector('h1')?.focus({ preventScroll: true });
  } else if (focusId) {
    document.getElementById(focusId)?.focus({ preventScroll: true });
  } else if (focusAction) {
    root.querySelector(`[data-action="${focusAction}"]`)?.focus({ preventScroll: true });
  }
  lastRoute = routeKey;
}

window.addEventListener('hashchange', render);
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  ui.installPrompt = event;
  if (parseRoute().name === 'settings') render();
});
window.addEventListener('appinstalled', () => {
  ui.installPrompt = null;
});

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

render();
