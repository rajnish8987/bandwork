// Prototype: counts reps and gives simple form cues with the camera. Everything runs
// on this device; no video leaves it. The library is large, so it loads only when opened.

import { createFormCoach, FORM_CUES } from '../core/formcheck.js';
import { t } from '../core/i18n.js';
import { createRepCounter } from '../core/repcount.js';
import { mountStage, stageControls, stagePanels } from './camera-stage.js';

const BASE = new URL('../../vendor/mediapipe/', import.meta.url).href;

// Kept for the whole visit. A workout opens the camera once a set, so loading it each
// time would make people wait before every set for no benefit.
let shared = null;

function getLandmarker() {
  shared ??= loadLandmarker().catch((err) => {
    shared = null; // so a failed download can be tried again
    throw err;
  });
  return shared;
}

async function loadLandmarker() {
  const { PoseLandmarker } = await import('../../vendor/mediapipe/vision_bundle.mjs');
  // Named directly so that only the one wasm build needs to ship with the app.
  const files = { wasmLoaderPath: `${BASE}vision_wasm_internal.js`, wasmBinaryPath: `${BASE}vision_wasm_internal.wasm` };
  // CPU, because it was verified on Android. The GPU option brought down the Android
  // emulator, and a crash is a far worse failure than a slightly lower frame rate.
  return PoseLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: `${BASE}pose_landmarker_lite.task`, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
}

// Screen landmarks carry how visible each point is; world landmarks carry true 3D
// positions, so angles hold up however the camera is placed.
function mergeLandmarks(result) {
  const screen = result.landmarks?.[0];
  const world = result.worldLandmarks?.[0];
  if (!screen || !world) return null;
  return world.map((p, i) => ({ ...p, visibility: screen[i].visibility ?? p.visibility }));
}

// Reps do not need every frame. Reading fewer keeps the page responsive and the laptop
// cooler over a long workout.
const MIN_FRAME_MS = 66;

/**
 * Starts the camera and calls onFrame(landmarks, time) for each frame it reads.
 * Returns a function that stops it.
 */
export function startPoseLoop({ video, onFrame, onReady, onError }) {
  let stream = null;
  let frame = null;
  let closed = false;
  let lastTime = -1;
  let lastRead = -Infinity;
  let landmarker = null;

  const loop = () => {
    if (closed) return;
    frame = requestAnimationFrame(loop);
    if (video.readyState < 2 || video.currentTime === lastTime) return;
    const at = performance.now();
    if (at - lastRead < MIN_FRAME_MS) return;
    lastRead = at;
    lastTime = video.currentTime;
    onFrame(mergeLandmarks(landmarker.detectForVideo(video, at)), at);
  };

  (async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera');
      landmarker = await getLandmarker();
      if (closed) return;
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
      if (closed) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      video.classList.add('live');
      onReady?.();
      loop();
    } catch (err) {
      if (closed) return;
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      onError?.(denied
        ? t('Camera permission is off. Allow the camera for Tensile, then try again.')
        : t('The rep counter could not start on this device. You can still count your reps by hand.'));
    }
  })();

  return () => {
    closed = true;
    if (frame) cancelAnimationFrame(frame);
    stream?.getTracks().forEach((track) => track.stop());
  };
}

/**
 * Opens the camera coach.
 * onCount(count) runs when a rep is counted; onCue(text) when there is form advice;
 * onUse(count) when the person keeps the count; without it, this is practice and there
 * is no count to keep. onClose runs when the camera closes. colors are the avatar's; view
 * says which parts of the screen to show, and onViewChange receives each change.
 */
export function openCamera({ exercise, slowNegatives, onCount, onCue, onUse, onClose, colors, view, onViewChange }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'camera';
  dialog.innerHTML = `
    <header class="camera-head">
      <h2 tabindex="-1" autofocus>${t('Camera coach')}: ${t(exercise.name)}</h2>
      ${stageControls({ notes: true })}
    </header>
    ${stagePanels('camera-video')}
    <div class="camera-bar">
      <output class="camera-count" id="camera-count" aria-live="polite">0</output>
      <div class="camera-words">
        <p class="camera-cue" id="camera-cue" role="status" hidden></p>
        <p class="hint" id="camera-status" role="status">${t('Loading the rep counter. The first time needs a connection and about 20 MB.')}</p>
        <div class="camera-notes-box" id="camera-notes" hidden>
          <strong>${t('Form notes')}</strong>
          <ul class="camera-notes"></ul>
        </div>
      </div>
      <div class="dialog-actions">
        <button type="button" class="primary" id="camera-use" disabled>${onUse ? t('Use this count') : t('Finish')}</button>
        <button type="button" class="text-button" id="camera-cancel">${t('Cancel')}</button>
      </div>
    </div>
    <p class="hint camera-about">${t('Prototype. It counts reps and checks speed, range, evenness and leaning. It cannot see everything, such as a rounded back, so it does not replace a coach. Video stays on this device.')}</p>`;
  document.body.append(dialog);
  dialog.showModal();

  const video = dialog.querySelector('#camera-video');
  const status = dialog.querySelector('#camera-status');
  const countBox = dialog.querySelector('#camera-count');
  const useButton = dialog.querySelector('#camera-use');
  const cueBox = dialog.querySelector('#camera-cue');
  const notes = dialog.querySelector('#camera-notes');
  const stage = mountStage(dialog, { view, onChange: onViewChange });
  stage.showExercise(exercise, colors);
  const coach = createFormCoach(exercise, { slowNegatives });
  const counter = createRepCounter(exercise, { onRep: (rep) => coach.repDone(rep) });

  const showNotes = () => {
    const rows = Object.entries(coach.tally).map(([cue, times]) => `<li>${FORM_CUES[cue]()} (${times})</li>`);
    notes.hidden = !rows.length;
    notes.querySelector('ul').innerHTML = rows.join('');
  };

  let shown = 0;

  const onFrame = (landmarks, at) => {
    const count = counter.update(landmarks, at);
    const cue = coach.observe(landmarks, at);
    if (cue) {
      const text = FORM_CUES[cue]();
      cueBox.textContent = text;
      cueBox.hidden = false;
      onCue?.(text);
      showNotes();
    }
    status.textContent = counter.visible ? t('Tracking. Keep your whole body in view.') : t('Step back until your whole body is in view.');
    if (count !== shown) {
      shown = count;
      countBox.textContent = count;
      onCount?.(count);
      showNotes();
    }
  };

  const stop = startPoseLoop({
    video,
    onFrame,
    onReady: () => {
      useButton.disabled = false;
      status.textContent = t('Step back until your whole body is in view.');
    },
    onError: (message) => {
      status.textContent = message;
      status.classList.add('camera-error');
    },
  });

  useButton.addEventListener('click', () => {
    onUse?.(counter.count);
    dialog.close();
  });
  dialog.querySelector('#camera-cancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    stop();
    stage.stop();
    dialog.remove();
    onClose?.();
  });
}
