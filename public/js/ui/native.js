// What differs between the Android app and a browser. The Android app supplies
// window.Capacitor; in a browser these fall back to web features.

import { ALL_NOTIFICATION_IDS, notificationSchedule } from '../core/reminders.js';

export function isNative() {
  return Boolean(window.Capacitor?.isNativePlatform?.());
}

/**
 * An Android plugin. Each method goes straight through the bridge Android injects,
 * because this app does not bundle the JavaScript part of Capacitor.
 */
export function plugin(name) {
  return new Proxy({}, {
    get: (_, method) => (options = {}) => window.Capacitor.nativePromise(name, String(method), options),
  });
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

/**
 * Replaces the weekly notifications. allowed is false if Android permission is refused.
 * Asking for exact timing makes the plugin open Android's "Alarms & reminders" page; if
 * the person declines, it schedules them anyway and returns a warning.
 */
export async function applyNativeReminders(reminders) {
  const notifications = plugin('LocalNotifications');
  await notifications.cancel({ notifications: ALL_NOTIFICATION_IDS.map((id) => ({ id })) });
  if (!reminders.days.length) return { allowed: true, exact: false };
  const { display } = await notifications.requestPermissions();
  if (display !== 'granted') return { allowed: false, exact: false };
  const wantsExact = Boolean(reminders.exact);
  const result = await notifications.schedule({ notifications: notificationSchedule(reminders, { exact: wantsExact }) });
  return { allowed: true, exact: wantsExact && !result?.warning };
}
