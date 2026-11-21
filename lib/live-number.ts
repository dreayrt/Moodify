// Instance-scoped, so clocks and meters never notify another player or room.
export function createLiveNumber(initial = 0) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => value,
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    set: (next: number) => {
      if (!Number.isFinite(next) || Object.is(next, value)) return;
      value = next;
      for (const listener of listeners) listener();
    },
  };
}
export type LiveNumber = ReturnType<typeof createLiveNumber>;
