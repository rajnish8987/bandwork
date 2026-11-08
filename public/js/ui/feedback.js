// Sound, vibration and keeping the screen awake. Each is optional in browsers,
// so failures are ignored and the workout carries on.

let audio = null;

/** Call from a tap: browsers only allow sound once the person has interacted. */
export function unlockSound() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    audio = null;
  }
}

/** A short beep for the rep tempo: high on the way up, low on the way down. */
export function tempoBeep(high) {
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const at = audio.currentTime;
  osc.frequency.value = high ? 880 : 523;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.3, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
  osc.connect(gain).connect(audio.destination);
  osc.start(at);
  osc.stop(at + 0.14);
}

export function restEnded({ sound, vibrate }) {
  if (vibrate) navigator.vibrate?.([220, 100, 220]);
  if (!sound || !audio) return;
  [0, 0.22, 0.44].forEach((delay) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const at = audio.currentTime + delay;
    osc.frequency.value = delay === 0.44 ? 1046 : 784;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + 0.2);
  });
}

let wakeLock = null;
let wanted = false;

async function acquire() {
  if (!wanted || wakeLock || !('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch {
    wakeLock = null;
  }
}

export function keepScreenOn(on) {
  wanted = on;
  if (on) acquire();
  else {
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') acquire();
});
