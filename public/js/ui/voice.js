// Speaks coaching cues. The Android app uses its text-to-speech plugin because the
// embedded browser may not have a voice; browsers use their own. If a device has no
// voice for the language, cues are simply silent and the beeps still play.

import { localeTag } from '../core/i18n.js';
import { pickVoice } from '../core/voices.js';
import { isNative, plugin } from './native.js';

let voices = [];
let loading = null;

export function canSpeak() {
  return isNative() || 'speechSynthesis' in window;
}

function browserVoices() {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);
  return new Promise((resolve) => {
    const now = speechSynthesis.getVoices();
    if (now.length) {
      resolve(now);
      return;
    }
    // Browsers fill this list a moment after the page opens.
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 3000);
  });
}

/** The voices this device has. An empty list is tried again next time. */
export function loadVoices() {
  const found = isNative()
    ? plugin('TextToSpeech').getSupportedVoices().then((result) => result.voices ?? [])
    : browserVoices();
  loading ??= found.catch(() => []).then((list) => {
    voices = list;
    if (!list.length) loading = null;
    return list;
  });
  return loading;
}

/** Says the text. voiceURI is the voice to use; without one the device chooses. */
export function speak(text, voiceURI = null) {
  if (!text) return;
  try {
    const voice = pickVoice(voices, voiceURI, localeTag());
    if (isNative()) {
      const engine = plugin('TextToSpeech');
      engine.stop().catch(() => {});
      // The plugin takes a voice's position in the list it gave us.
      engine.speak({ text, lang: localeTag(), rate: 1, ...(voice ? { voice: voices.indexOf(voice) } : {}) }).catch(() => {});
      return;
    }
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const line = new SpeechSynthesisUtterance(text);
    line.lang = voice?.lang ?? localeTag();
    if (voice) line.voice = voice;
    speechSynthesis.speak(line);
  } catch {
    // A missing voice must never interrupt the workout.
  }
}

export function stopSpeaking() {
  try {
    if (isNative()) plugin('TextToSpeech').stop().catch(() => {});
    else if ('speechSynthesis' in window) speechSynthesis.cancel();
  } catch {
    // As above.
  }
}
