// Hands-free mode: the camera stays on for the whole workout. It counts each set, logs
// it when the person stops, lets the rest timer run and moves on. The workout itself
// carries on underneath as normal, so logging, rest and history all work the same.
// Video stays on this device.

import { createFormCoach, FORM_CUES } from '../core/formcheck.js';
import { createHandsUp, createSetWatcher, gestureAllowed, repsToLog } from '../core/handsfree.js';
import { t } from '../core/i18n.js';
import { createRepCounter, supportsRepCount } from '../core/repcount.js';
import { startPoseLoop } from './camera.js';
import { mountFigure } from './figure.js';
import { esc } from './html.js';

const CUE_SPEECH_MS = 3500;

/**
 * app supplies the live workout:
 *  view(): the current set, or null once the workout has ended
 *  finishSet(reps): log the set and move on
 *  skipRest(): end the rest now
 *  countAlong(onDone): beep a set the camera cannot follow, then call onDone(reps)
 *  stopCounting(): stop that count
 *  say(text), beep(): speak, and sound a beep
 *  announce(): say the current set
 *  onClose(): the mode has ended
 */
export function openHandsFree(app) {
  const dialog = document.createElement('dialog');
  dialog.className = 'camera hands-free';
  dialog.innerHTML = `
    <h2 id="hf-name">${esc(t('Hands-free'))}</h2>
    <div class="camera-view">
      <video id="hf-video" playsinline muted></video>
      <output class="camera-count" id="hf-count" aria-live="off"></output>
    </div>
    <p class="hf-goal" id="hf-goal" role="status"></p>
    <p class="camera-cue" id="hf-cue" role="status" hidden></p>
    <div class="hf-figure" id="hf-figure"></div>
    <p class="hint" id="hf-status" role="status">${esc(t('Loading the rep counter. The first time needs a connection and about 20 MB.'))}</p>
    <div class="dialog-actions">
      <button type="button" class="primary" id="hf-next" disabled>${esc(t('Finish this set'))}</button>
      <button type="button" class="text-button" id="hf-leave">${esc(t('Leave hands-free'))}</button>
    </div>
    <p class="hint">${esc(t('Raise both hands and hold to move on. Each set is logged on its own, with the band named here. Leave hands-free to change anything.'))}</p>`;
  document.body.append(dialog);
  dialog.showModal();

  const box = (id) => dialog.querySelector(`#${id}`);
  const nameBox = box('hf-name');
  const countBox = box('hf-count');
  const goalBox = box('hf-goal');
  const cueBox = box('hf-cue');
  const figureBox = box('hf-figure');
  const statusBox = box('hf-status');
  const nextButton = box('hf-next');

  const gesture = createHandsUp();
  let stopLoop = null;
  let finished = false;
  let key = null;
  let set = null; // what is being tracked for the set in progress
  let cueUntil = 0;

  const close = () => {
    if (finished) return;
    finished = true;
    dialog.close();
  };

  const write = (node, text) => {
    if (node.textContent !== text) node.textContent = text;
  };

  const showCue = (text) => {
    write(cueBox, text);
    cueBox.hidden = !text;
  };

  const beginSet = (view, now) => {
    set = {
      view,
      watcher: createSetWatcher({ target: view.target, perSide: view.exercise.perSide, startedAt: now }),
      supported: supportsRepCount(view.exercise),
      coach: createFormCoach(view.exercise, { slowNegatives: view.slowNegatives }),
      shown: 0,
      lastRepAt: now,
      counting: false,
      logged: false,
    };
    set.counter = set.supported ? createRepCounter(view.exercise, { onRep: (rep) => set.coach.repDone(rep) }) : null;
    showCue('');
    write(countBox, '0');
  };

  const logSet = (reps) => {
    if (!set || set.logged) return;
    set.logged = true;
    app.stopCounting();
    app.finishSet(reps);
  };

  /** Ends the set now, with what was counted. */
  const finishNow = () => {
    if (!set) return;
    logSet(repsToLog({ count: set.counter?.count ?? 0, target: set.view.target, perSide: set.view.exercise.perSide }));
  };

  const showRest = (view, landmarks, now) => {
    write(nameBox, t('Rest'));
    write(countBox, String(view.restSeconds));
    write(goalBox, t('Next: {name}. {set}.', { name: t(view.exercise.name), set: view.setText }));
    write(nextButton, t('Skip rest'));
    write(statusBox, t('Get your next band ready.'));
    if (gesture.update(landmarks, now)) app.skipRest();
  };

  const trackCamera = (view, landmarks, at, phase) => {
    const { counter, coach } = set;
    const count = counter.update(landmarks, at);
    const cue = coach.observe(landmarks, at);
    if (cue) {
      const text = FORM_CUES[cue]();
      showCue(text);
      cueUntil = at + CUE_SPEECH_MS;
      app.say(text);
    }
    write(statusBox, counter.visible ? t('Tracking. Keep your whole body in view.') : t('Step back until your whole body is in view.'));
    write(countBox, String(count)); // also clears the last digit of the countdown
    if (count !== set.shown) {
      set.shown = count;
      set.lastRepAt = at;
      app.beep();
      if (at >= cueUntil) app.say(String(count));
    }
    const allowed = gestureAllowed({ exerciseId: view.exercise.id, count, sinceRepMs: at - set.lastRepAt });
    if (gesture.update(allowed ? landmarks : null, at)) finishNow();
    else if (phase === 'finish') finishNow();
  };

  const showSet = (view, landmarks, at) => {
    write(nameBox, t(view.exercise.name));
    write(goalBox, `${view.setText}. ${view.goal}. ${view.bandText}`);
    write(nextButton, t('Finish this set'));

    const count = set.counter?.count ?? 0;
    const { phase, secondsLeft, switchSides } = set.watcher.update(count, at);
    if (switchSides) app.say(t('Switch sides'));
    if (phase === 'ready') {
      write(countBox, String(secondsLeft));
      write(statusBox, t('Get ready'));
      return;
    }
    if (!set.supported) {
      if (!set.counting) {
        set.counting = true;
        write(countBox, '');
        write(statusBox, t('The camera cannot follow this one, so follow the beeps.'));
        app.countAlong(logSet);
      }
      const allowed = gestureAllowed({ exerciseId: view.exercise.id, count: 0, sinceRepMs: 0 });
      if (gesture.update(allowed ? landmarks : null, at)) finishNow();
      return;
    }
    trackCamera(view, landmarks, at, phase);
  };

  const onFrame = (landmarks, at) => {
    const view = app.view();
    if (!view) {
      app.say(t('Workout finished. Well done.'));
      close();
      return;
    }
    const nextKey = `${view.resting ? 'rest' : 'set'}:${view.step.exIndex}:${view.step.setIndex}`;
    if (nextKey !== key) {
      key = nextKey;
      figureBox.style.setProperty('--band', view.bandColor);
      mountFigure(figureBox, view.exercise);
      if (view.resting) set = null;
      else beginSet(view, at);
    }
    if (view.resting) showRest(view, landmarks, at);
    else showSet(view, landmarks, at);
  };

  nextButton.addEventListener('click', () => {
    if (set) finishNow();
    else app.skipRest();
  });
  box('hf-leave').addEventListener('click', () => close());
  dialog.addEventListener('close', () => {
    finished = true;
    stopLoop?.();
    app.stopCounting();
    dialog.remove();
    app.onClose();
  });

  stopLoop = startPoseLoop({
    video: box('hf-video'),
    onReady: () => {
      nextButton.disabled = false;
      write(statusBox, t('Step back until your whole body is in view.'));
      app.announce();
    },
    onFrame,
    onError: (message) => {
      write(statusBox, message);
      statusBox.classList.add('camera-error');
    },
  });
}
