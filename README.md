# Bandwork

A resistance-band workout app for your laptop and Android phone. It builds a plan
from the bands you own, guides each set with an animated figure, runs your rest
timer and tells you when to move to a stronger band.

**Open it: <https://rajnish8987.github.io/bandwork/>**

There are no accounts, ads or tracking. Your data stays on your device.

## What it does

- **Plan:** 2, 3 or 4 days a week, in 20, 30 or 45 minute sessions, for strength,
  muscle or endurance.
- **27 exercises:** each with an animated figure and written instructions. Works
  with bands alone; a door anchor or mini loop adds more exercises.
- **Guided sets:** log reps and the band used, with bands stacked if you like.
- **Rest timer:** with sound, vibration and the screen kept on.
- **Automatic progress:** add reps up to the top of your range, then move to the
  next band. Two sessions in a row under the range moves you down one.
- **History:** a chart for each exercise, weekly consistency and a workout list.
- **Works offline:** once installed from a secure address.

## Run it from your laptop

Use this to run your own copy instead of the address above. You need [Node.js](https://nodejs.org) 22 or newer. Nothing else to install.

Double-click `Start Bandwork.cmd`, or run:

```
npm start
```

Then open <http://localhost:5173>. To install it as a laptop app, click the install
icon at the right of the Chrome or Edge address bar.

## Run it on your Android phone

1. Open <https://rajnish8987.github.io/bandwork/> in Chrome on your phone.
2. Tap the menu, then **Add to Home screen** and **Install**. If Chrome offers it,
   **Install Bandwork** in the app's Settings does the same.

It then opens from your home screen like any other app and works with no connection.
Updates download in the background and appear the next time you open it.

The laptop can use the same address, instead of running anything locally. Each
device keeps its own data.

### Without internet: over your Wi-Fi

1. Start Bandwork on your laptop. The window shows a phone address, such as
   `http://192.168.1.20:5173`.
2. Connect your phone to the same Wi-Fi and open that address in Chrome.
3. If it doesn't load, allow Node.js through Windows Firewall on private networks.

In this mode your laptop must be on and Bandwork running. The phone can't use it
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

No framework, build step or runtime dependencies.

```
npm test        # logic, server and offline-list tests
npm run icons   # redraw the app icons
```

- `public/` is everything that gets served. `public/js/core` holds the plan,
  progression, session and storage logic, with no browser code. `public/js/ui` holds
  the screens and figure.
- Pushing to `main` runs the tests and publishes `public/` to GitHub Pages.
- When adding a file to `public/`, add it to the list in `public/sw.js`. A test fails
  if you forget.
- To add an exercise, add it to `public/js/core/exercises.js`. Tests check that its
  poses fit the frame and stay above the floor.

Fonts: Big Shoulders Display and Atkinson Hyperlegible, under the SIL Open Font
License (see `public/fonts`).
