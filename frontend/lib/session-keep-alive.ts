import { ApiError, apiRequest } from "./api";

const REFRESH_INTERVAL_MS = 45 * 60 * 1000;

/**
 * Silently renew the access token and sliding refresh cookie while the
 * Kova tab or installed PWA is open.
 */
export type RenewSessionResult =
  | { ok: true; access: string }
  | { ok: false; reason: "unauthorized" | "network" };

export async function renewSession(): Promise<RenewSessionResult> {
  try {
    const response = await apiRequest<{ access: string }>(
      "/auth/refresh/",
      { method: "POST", timeoutMs: 8000 },
    );

    if (!response?.access) {
      return { ok: false, reason: "network" };
    }

    return { ok: true, access: response.access };
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401
    ) {
      return { ok: false, reason: "unauthorized" };
    }

    return { ok: false, reason: "network" };
  }
}

/**
 * Periodically refresh the session. Never signs the user out on failure —
 * a failed background refresh must not kick someone to login while they
 * are actively working.
 */
export function startSessionKeepAlive(
  onAccessToken: (token: string) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  let stopped = false;

  async function tick() {
    if (stopped) {
      return;
    }

    const result = await renewSession();

    if (result.ok) {
      onAccessToken(result.access);
    }
  }

  const intervalId = window.setInterval(
    tick,
    REFRESH_INTERVAL_MS,
  );

  return () => {
    stopped = true;
    window.clearInterval(intervalId);
  };
}
