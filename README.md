# Tensile

A resistance-band workout app for your laptop and Android phone. It builds a plan
from the bands you own, guides each set with an animated figure, runs your rest
timer and tells you when to move to a stronger band.

Created and owned by **Rajnish Singh**: [LinkedIn](https://www.linkedin.com/in/rajnish8987), [GitHub](https://github.com/rajnish8987). © 2026, all rights reserved.

**Open it: <https://rajnish8987.github.io/bandwork/>**

The web app and the Android app are built from the same `public/` folder. The version in Settings tells you they match.

There are no accounts, and Tensile itself has no ads or tracking. Your data stays on your
device. The optional exercise videos come from YouTube, which may show ads and collect data,
but only once you press play.

## What it does

**Your plan**

- **Level:** beginner, intermediate or master, which suggests the band for each exercise.
- **Short and long term plan:** built for you at setup, 4 weeks then 24 weeks, with
  lighter weeks included. It follows any change to your level or goal.
- **Plan options:** 2 to 7 days a week, 15 to 60 minute sessions, five goals, a focus
  area, sore areas to go easy on, and your own rest time.
- **Other programs:** fixed 8 and 12 week blocks.
- **Your own workouts:** pick the exercises, run one once or use them as your plan.
- **Only 10 minutes today:** three key exercises, two sets each, short rests.
- **Weekly schedule:** choose a workout or rest for each of the 7 days, with advice if
  the same muscles get no time to recover.
- **27 exercises:** each with an animated figure, written instructions and a real video
  from YouTube. Works with bands alone; a door anchor or mini loop adds more exercises.

**During a workout**

- **Guided warm-up and cool-down:** timed moves chosen for that session.
- **Voice coach:** speaks each set and counts reps, so your hands stay free.
- **Rep count:** beeps and a count at the speed you choose, with a pause to switch
  sides.
- **Camera coach (prototype):** counts reps and cues you on speed, range, left and
  right evenness and leaning. It cannot see things like a rounded back, and it does not
  replace a coach. Video from your camera never leaves your device.
- **Logging:** reps, the band used (stack them if you like), how hard the set felt,
  and your stance, grip and distance from the door.
- **Rest timer:** with sound, vibration and the screen kept on.

**Progress that adjusts itself**

- **Automatic targets:** add reps up to the top of your range, then move to the next
  band. Two sessions in a row under the range moves you down one. Sets rated easy
  move faster, and a set at your limit holds you where you are.
- **Lighter weeks:** after six straight weeks of training, or when recent sets are
  mostly at your limit. You can turn one down.
- **Guide tab:** screenshots and moving pictures of each feature.
- **Coming back:** two weeks or more away starts you on a lighter band.
- **Insights:** sets per muscle, balance warnings, personal records, a chart for each
  exercise, and streaks counted by week so a missed day never breaks them.

**Your bands**

- **Real tension:** measure each band with a luggage scale, since labels are guesses.
- **Safety checks:** tracks each band's age and use, and reminds you to inspect it.
  The intervals are a rule of thumb, not a manufacturer's limit.

**Everywhere**

- **Reminders:** phone notifications in the Android app, or a calendar event from the
  browser version.
- **Languages and units:** English, Hindi and Spanish, in kg or lb.
- **Works offline:** once installed from a secure address.

The Hindi and Spanish text has not yet been reviewed by a native speaker. Corrections
are welcome, and a new language is one file in `public/js/core/locales`.

## Install the Android app (APK)

The APK holds the whole app, so it works with no connection from the first launch. It
also adds real notification reminders.

1. Copy `dist/Tensile.apk` to your phone, or send it to yourself.
2. Open it on the phone. Android will ask you to allow installs from that app, once.
3. Tap **Install**.

It keeps its own data, separate from the browser version. Use **Save a backup** and
**Restore a backup** in Settings to move your data across.

To build the APK on Windows:

```
npm run android:setup   # once: private Java and Android tools, about 3 GB
npm run apk             # writes dist/Tensile.apk
```

`android:setup` shows the Android SDK licence terms for you to accept. It adds nothing to
your system settings; delete `%LOCALAPPDATA%\BandworkAndroid` to remove everything. This is a debug
build for your own phones. A Play Store release would need its own signing key.

## Run it from your laptop

Use this to run your own copy instead of the address above. You need [Node.js](https://nodejs.org) 22 or newer. Nothing else to install.

Double-click `Start Tensile.cmd`, or run:

```
npm start
```

Then open <http://localhost:5173>. To install it as a laptop app, click the install
icon at the right of the Chrome or Edge address bar.

## Run it on your Android phone

1. Open <https://rajnish8987.github.io/bandwork/> in Chrome on your phone.
2. Tap the menu, then **Add to Home screen** and **Install**. If Chrome offers it,
   **Install Tensile** in the app's Settings does the same.

It then opens from your home screen like any other app and works with no connection.
Updates download in the background and appear the next time you open it.

The laptop can use the same address, instead of running anything locally. Each
device keeps its own data.

### Without internet: over your Wi-Fi

1. Start Tensile on your laptop. The window shows a phone address, such as
   `http://192.168.1.20:5173`.
2. Connect your phone to the same Wi-Fi and open that address in Chrome.
3. If it doesn't load, allow Node.js through Windows Firewall on private networks.

In this mode your laptop must be on and Tensile running. The phone can't use it
offline or keep the screen on, because Android only allows those on a secure
(`https`) address. Your laptop's Wi-Fi address can also change, and the phone treats
a new address as a new app with no data, so save a backup if you use this for long.

## Move data between devices

Laptop and phone keep separate records; they don't sync. To move data, go to
**Settings**, choose **Save a backup** on one device, send the file to the other, and
choose **Restore a backup** there. Restoring replaces what's on that device.

Android can clear browser data if you clear Chrome's storage or uninstall the app, so
save a backup from time to time.

## Good to know

- Tension figures are only a guide, because a band's pull changes with how far you
  stretch it. Keep your stance and anchor point the same to compare sessions fairly.
- Check bands for nicks or cracks before each session and replace damaged ones.
- The instructions are general guidance, not medical advice. Stop if something hurts,
  and check with a doctor first if you have an injury or health condition.

## For developers

The web app has no framework, build step or runtime dependencies. The npm packages are
only for wrapping it as an Android app with Capacitor.

```
npm test        # logic, server, translation and offline-list tests
npm run icons   # redraw the app icons
npm run apk     # build the Android app
```

- `public/` is everything that gets served. `public/js/core` holds the logic, with no
  browser code. `public/js/ui` holds the screens, figure, voice and camera.
- `android/` is the Capacitor project. `tools/build-apk.mjs` builds it in a folder
  outside this one, because Android builds make many thousands of files.
- `public/vendor/mediapipe` is the pose library for the camera rep counter. It loads
  only when first opened. It tries to send usage logs to Google; the page's Content
  Security Policy blocks that, so keep `connect-src` limited to the app itself.
- Guide pictures in `public/guide` come from the real app: run `npm run guide` after
  `npm run apk`, which installs the tools it needs.
- Exercise videos are listed in `public/js/core/videos.js`. A weekly GitHub Action runs
  `tools/check-videos.mjs` and fails if a video was removed or stops allowing embedding.
- Pushing to `main` runs the tests and publishes `public/` to GitHub Pages.
- When adding a file to `public/`, add it to the list in `public/sw.js`, except in
  `vendor/`. A test fails if you forget.
- When adding text, wrap it in `t('...')` and add it to each file in
  `public/js/core/locales`. A test names any phrase that is missing.
- To add an exercise, add it to `public/js/core/exercises.js`. Tests check that its
  poses fit the frame and stay above the floor.

Fonts: Big Shoulders Display and Atkinson Hyperlegible, under the SIL Open Font
License (see `public/fonts`). MediaPipe: Apache License 2.0 (see `public/vendor/mediapipe`).
