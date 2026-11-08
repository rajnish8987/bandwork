// What differs between the Android app and a browser. The Android app supplies
// window.Capacitor; in a browser these fall back to web features.

import { ALL_NOTIFICATION_IDS, notificationSchedule } from '../core/reminders.js';

const cache = new Map();

export function isNative() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

/** An Android plugin, reached through the bridge the app injects. */
export function plugin(name) {
  if (!cache.has(name)) cache.set(name, window.Capacitor.registerPlugin(name));
  return cache.get(name);
}

function downloadInBrowser(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Saves a text file. On Android this opens the share sheet to choose where it goes. */
export async function saveTextFile(filename, text, type) {
  if (!isNative()) {
    downloadInBrowser(filename, text, type);
    return;
  }
  const { uri } = await plugin('Filesystem').writeFile({ path: filename, data: text, directory: 'CACHE', encoding: 'utf8' });
  await plugin('Share').share({ title: filename, url: uri });
}

/** Replaces the weekly notifications. Returns false if Android permission is refused. */
export async function applyNativeReminders(reminders) {
  const notifications = plugin('LocalNotifications');
  await notifications.cancel({ notifications: ALL_NOTIFICATION_IDS.map((id) => ({ id })) });
  if (!reminders.days.length) return true;
  const { display } = await notifications.requestPermissions();
  if (display !== 'granted') return false;
  await notifications.schedule({ notifications: notificationSchedule(reminders) });
  return true;
}
