// Speaks coaching cues. The Android app uses its text-to-speech plugin because the
// embedded browser may not have a voice; browsers use their own. If a device has no
// voice for the language, cues are simply silent and the beeps still play.

import { localeTag } from '../core/i18n.js';
import { isNative, plugin } from './native.js';

export function canSpeak() {
  return isNative() || 'speechSynthesis' in window;
}

export function speak(text) {
  if (!text) return;
  try {
    if (isNative()) {
      const voice = plugin('TextToSpeech');
      voice.stop().catch(() => {});
      voice.speak({ text, lang: localeTag(), rate: 1 }).catch(() => {});
      return;
    }
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const line = new SpeechSynthesisUtterance(text);
    line.lang = localeTag();
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
