type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

const inflight = new Map<string, Promise<unknown>>();

export function invalidateResourceCache(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export async function cachedResource<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
  options?: { revalidate?: boolean },
): Promise<T> {
  const now = Date.now();
  const cached = store.get(key) as CacheEntry<T> | undefined;

  if (cached && cached.expiresAt > now) {
    if (options?.revalidate) {
      void fetcher()
        .then((value) => {
          store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
          });
        })
        .catch(() => undefined);
    }

    return cached.value;
  }

  const pending = inflight.get(key) as Promise<T> | undefined;

  if (pending) {
    return pending;
  }

  const request = fetcher()
    .then((value) => {
      store.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);

  return request;
}
