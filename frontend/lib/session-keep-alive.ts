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
      { method: "POST" },
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

export function startSessionKeepAlive(
  onAccessToken: (token: string) => void,
  onSessionLost: () => void,
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

    if (!result.ok) {
      if (result.reason === "unauthorized") {
        onSessionLost();
      }
      return;
    }

    onAccessToken(result.access);
  }

  const intervalId = window.setInterval(tick, REFRESH_INTERVAL_MS);

  function handleVisibility() {
    if (document.visibilityState === "visible") {
      void tick();
    }
  }

  function handleFocus() {
    void tick();
  }

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("focus", handleFocus);

  return () => {
    stopped = true;
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("focus", handleFocus);
  };
}
