type Entry = { expires: number; promise: Promise<unknown> };
const entries = new Map<string, Entry>();
let currentScope: string | null = null;
let listening = false;

export function invalidateSessionReads() {
  entries.clear();
}

export function readSessionCached<T>(key: string, scope: string, load: () => Promise<T>, ttl = 15_000): Promise<T> {
  if (typeof window === "undefined") return load();
  if (!listening) {
    for (const event of ["moodify-auth-changed", "moodify-playlist-updated", "moodify-library-updated", "moodify-subscription-updated"]) {
      window.addEventListener(event, invalidateSessionReads);
    }
    window.addEventListener("storage", (event) => {
      if (!event.key || event.key === "moodify.auth.session") invalidateSessionReads();
    });
    listening = true;
  }
  if (scope !== currentScope) { entries.clear(); currentScope = scope; }
  const existing = entries.get(key);
  if (existing && existing.expires > Date.now()) return existing.promise as Promise<T>;
  const entry: Entry = { expires: Infinity, promise: Promise.resolve() };
  entry.promise = Promise.resolve().then(load).then((value) => {
    if (entries.get(key) === entry) entry.expires = Date.now() + ttl;
    return value;
  }, (error) => {
    if (entries.get(key) === entry) entries.delete(key);
    throw error;
  });
  entries.set(key, entry);
  return entry.promise as Promise<T>;
}
