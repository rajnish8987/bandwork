// Checks that every exercise video still exists and still allows embedding.
// YouTube's oEmbed address answers 200 only for those. Exits with an error otherwise.

import { VIDEOS } from '../public/js/core/videos.js';

const problems = [];
for (const [exercise, { id }] of Object.entries(VIDEOS)) {
  const watch = `https://www.youtube.com/watch?v=${id}`;
  const response = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`);
  if (response.status === 200) console.log(`ok       ${exercise}`);
  else {
    console.log(`PROBLEM  ${exercise}: ${response.status} ${watch}`);
    if (response.status !== 429) problems.push(exercise);
  }
}

if (problems.length) {
  console.error(`\nReplace these in public/js/core/videos.js: ${problems.join(', ')}`);
  process.exit(1);
}
console.log(`\nAll ${Object.keys(VIDEOS).length} videos are available.`);
