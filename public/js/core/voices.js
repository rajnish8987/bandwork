// Which speech voices to offer. Each device has its own list and no device says whether
// a voice sounds male or female, so people choose by listening. A choice is saved by its
// voiceURI, and a device without that voice uses its default.

const normal = (tag) => String(tag ?? '').replace('_', '-').toLowerCase();
const language = (tag) => normal(tag).slice(0, 2);

/** "Microsoft George - English (United Kingdom)" becomes George, and the rest. */
export function voiceLabel(voice) {
  const [name, ...rest] = voice.name.replace(/^Microsoft\s+/, '').split(' - ');
  return { name, detail: rest.join(' - ') || voice.lang };
}

/** The voices for a language: the closest accent first, and on-device ones before online. */
export function voicesForLanguage(voices, tag) {
  const rank = (voice) => (normal(voice.lang) === normal(tag) ? 0 : 2) + (voice.localService === false ? 1 : 0);
  const defaultFirst = (a, b) => Number(Boolean(b.default)) - Number(Boolean(a.default));
  return voices
    .filter((voice) => language(voice.lang) === language(tag))
    .sort((a, b) => rank(a) - rank(b) || defaultFirst(a, b) || voiceLabel(a).name.localeCompare(voiceLabel(b).name));
}

/** The saved voice, if this device has it for the language in use. Otherwise null, for the default. */
export function pickVoice(voices, uri, tag) {
  if (!uri) return null;
  return voicesForLanguage(voices, tag).find((voice) => voice.voiceURI === uri) ?? null;
}
