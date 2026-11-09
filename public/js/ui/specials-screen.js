// The Specials tab: videos by level with jump points, and training know-how.

import { exerciseById } from '../core/exercises.js';
import { t } from '../core/i18n.js';
import { programStatus } from '../core/programs.js';
import {
  clockTime, KNOW_HOW, LEVELS, momentsForExercise, SPECIALS, SPECIALS_CHANNEL, SPECIALS_CHANNEL_URL, specialsForLevel,
} from '../core/specials.js';
import { TRACK, TRACK_ID } from '../core/track.js';
import { watchUrl } from '../core/videos.js';
import { esc } from './html.js';

const momentLabel = ([, label, exerciseId]) => (exerciseId ? t(exerciseById(exerciseId).name) : t(label));

function momentButton(special, moment) {
  const [seconds, , exerciseId] = moment;
  return `<li class="moment-row">
    <button type="button" class="moment" data-action="special-play" data-video="${esc(special.videoId)}" data-at="${seconds}" data-title="${esc(t(special.title))}">
      <span class="moment-time">${esc(clockTime(seconds))}</span> ${esc(momentLabel(moment))}
    </button>
    ${exerciseId ? `<a class="moment-link" href="#/exercises/${esc(exerciseId)}" aria-label="${esc(t('Open {name}', { name: t(exerciseById(exerciseId).name) }))}">${esc(t('Open'))}</a>` : ''}
  </li>`;
}

function specialCard(special) {
  return `<li class="special-card" id="special-${esc(special.id)}">
    <h3>${esc(t(special.title))}</h3>
    ${special.plan ? `<p>${esc(t(special.plan))}</p>` : ''}
    <div class="special-player" data-player>
      <button type="button" class="secondary small" data-action="special-play" data-video="${esc(special.videoId)}" data-at="0" data-title="${esc(t(special.title))}">${esc(special.minutes ? t('Watch, {minutes} min', { minutes: special.minutes }) : t('Watch'))}</button>
    </div>
    <p class="video-status" role="status" hidden></p>
    ${special.moments.length ? `<details class="moments-box">
      <summary>${esc(t('Jump to a moment'))} <small>(${special.moments.length})</small></summary>
      <ul class="moments">${special.moments.map((m) => momentButton(special, m)).join('')}</ul>
    </details>` : ''}
    <a class="plain-link" href="${esc(watchUrl(special.videoId))}" target="_blank" rel="noopener">${esc(t('Open in YouTube'))}</a>
  </li>`;
}

function trackButton(level, status) {
  if (!level.startWeek) return '';
  const running = status?.program.id === TRACK_ID && !status.finished;
  const inLevel = running && status.phase?.stage === level.id;
  if (inLevel) {
    return `<p class="band-status attention">${esc(t('You are on week {week} of {total}', { week: status.week, total: status.totalWeeks }))}</p>
      <button type="button" class="secondary small" data-action="program-stop">${esc(t('Stop this program'))}</button>`;
  }
  return `<button type="button" class="primary track-start" data-action="track-start" data-week="${level.startWeek}">${esc(t('Follow this level, from week {week}', { week: level.startWeek }))}</button>`;
}

function levelSection(level, status) {
  return `<section class="special-level" id="level-${esc(level.id)}">
    <h2>${esc(t(level.name))}</h2>
    <p class="lead">${esc(t(level.text))}</p>
    ${trackButton(level, status)}
    <ul class="special-list">${specialsForLevel(level.id).map(specialCard).join('')}</ul>
  </section>`;
}

function knowHowCard(item) {
  const [videoId, seconds] = item.ref;
  return `<li class="know-how">
    <details>
      <summary>${esc(t(item.title))}</summary>
      ${item.list ? `<ul class="cues">${item.list.map((line) => `<li>${esc(t(line))}</li>`).join('')}</ul>` : ''}
      ${(item.text ?? []).map((line) => `<p>${esc(t(line))}</p>`).join('')}
      <a class="plain-link" href="${esc(watchUrl(videoId, seconds))}" target="_blank" rel="noopener">${esc(t('See it in the video, at {time}', { time: clockTime(seconds) }))}</a>
    </details>
  </li>`;
}

export function specialsScreen({ state, now }) {
  const status = programStatus(state.profile, now);
  const jump = LEVELS.map((level) => `<a class="level-jump" href="#/specials/level-${esc(level.id)}">${esc(t(level.name))}</a>`).join('');
  return `<main class="page specials">
    <h1 class="display" tabindex="-1">${esc(t('Specials'))}</h1>
    <p class="lead">${esc(t('Videos with jump points, and a {name} that sets every workout for you.', { name: t(TRACK.name) }))}</p>
    <nav class="level-jumps" aria-label="${esc(t('Levels'))}">${jump}<a class="level-jump" href="#/specials/know-how">${esc(t('Know-how'))}</a></nav>
    <p class="hint">${esc(t('These {count} videos are by {channel} on YouTube, mostly in Hindi. They need internet. YouTube may show ads and collect data once one plays. Nothing loads until you tap.', { count: SPECIALS.length, channel: SPECIALS_CHANNEL }))} <a href="${esc(SPECIALS_CHANNEL_URL)}" target="_blank" rel="noopener">${esc(t('Visit the channel'))}</a></p>
    ${LEVELS.map((level) => levelSection(level, status)).join('')}
    <section class="special-level" id="know-how">
      <h2>${esc(t('Know-how'))}</h2>
      <p class="lead">${esc(t('The ideas behind the training, with the video each one comes from.'))}</p>
      <ul class="know-how-list">${KNOW_HOW.map(knowHowCard).join('')}</ul>
    </section>
  </main>`;
}

/** The jump points for one exercise, for its page. Empty when there are none. */
export function exerciseMoments(exerciseId) {
  const moments = momentsForExercise(exerciseId);
  if (!moments.length) return '';
  return `<section>
    <h2>${esc(t('In the specials'))}</h2>
    <ul class="moments">${moments.map(({ special, seconds }) => `<li class="moment-row">
      <a class="moment" href="${esc(watchUrl(special.videoId, seconds))}" target="_blank" rel="noopener">
        <span class="moment-time">${esc(clockTime(seconds))}</span> ${esc(t(special.title))}
      </a>
    </li>`).join('')}</ul>
    <p class="hint">${esc(t('By {channel} on YouTube, mostly in Hindi.', { channel: SPECIALS_CHANNEL }))}</p>
  </section>`;
}
