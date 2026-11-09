// The app used to live at /bandwork/. That address now returns 404, but a browser that
// opened it there keeps running the stored copy from its offline worker, frozen at that
// version and sharing this app's saved data. Removing the worker leaves saved data alone.

const OLD_PATH = '/bandwork/';

export async function removeOldCopies(container) {
  try {
    const workers = await container.getRegistrations();
    const old = workers.filter((worker) => new URL(worker.scope).pathname === OLD_PATH);
    await Promise.all(old.map((worker) => worker.unregister()));
  } catch {
    // It is tried again the next time the app starts.
  }
}
