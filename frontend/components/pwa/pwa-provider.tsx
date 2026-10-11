"use client";

import { useEffect, useState, type ReactNode } from "react";

interface PwaProviderProps {
  children: ReactNode;
}

const SESSION_DISMISS_KEY = "kova-pwa-install-dismissed-session";
const INSTALLED_KEY = "kova-pwa-installed";

function isStandaloneApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // iOS Safari
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean })
        .standalone === true)
  );
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Registers the Kova service worker and shows an install popup when users
 * open the app in the browser (once per session until dismissed or installed).
 */
export function PwaProvider({ children }: PwaProviderProps) {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallModal, setShowInstallModal] =
    useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (window.location.protocol !== "https:" && !isLocalhost) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        /* Registration failure should not block the app. */
      });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsIos(isIosDevice());

    function openInstallPopup() {
      if (isStandaloneApp()) {
        return;
      }

      if (localStorage.getItem(INSTALLED_KEY) === "1") {
        return;
      }

      if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") {
        return;
      }

      setShowInstallModal(true);
    }

    function handleBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      openInstallPopup();
    }

    function handleInstalled() {
      localStorage.setItem(INSTALLED_KEY, "1");
      setShowInstallModal(false);
      setInstallEvent(null);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstall,
    );
    window.addEventListener("appinstalled", handleInstalled);

    const schedulePopup = () => {
      openInstallPopup();
    };

    const idleCallback = (
      window as Window & {
        requestIdleCallback?: (
          callback: () => void,
          options?: { timeout: number },
        ) => number;
      }
    ).requestIdleCallback;

    const timer = idleCallback
      ? idleCallback(schedulePopup, { timeout: 2500 })
      : window.setTimeout(schedulePopup, 1500);

    return () => {
      const cancelIdle = (
        window as Window & {
          cancelIdleCallback?: (id: number) => void;
        }
      ).cancelIdleCallback;

      if (typeof timer === "number") {
        if (cancelIdle) {
          cancelIdle(timer);
        } else {
          window.clearTimeout(timer);
        }
      }
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstall,
      );
      window.removeEventListener(
        "appinstalled",
        handleInstalled,
      );
    };
  }, []);

  function dismissForSession() {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setShowInstallModal(false);
  }

  async function installApp() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "1");
    }

    setShowInstallModal(false);
    setInstallEvent(null);
  }

  const canNativeInstall = Boolean(installEvent);

  return (
    <>
      {children}

      {showInstallModal && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-[#17211D]/55 p-4 sm:items-center"
          role="presentation"
          onClick={dismissForSession}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="kova-install-title"
            className="w-full max-w-md border border-[#E5E7E5] bg-white p-6 shadow-2xl sm:rounded-lg"
            onClick={(event) => event.stopPropagation()}
          >
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center bg-[#176B4D] text-2xl font-bold text-[#F4B183]"
              aria-hidden="true"
            >
              K
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#176B4D]">
                Install Kova
              </p>
              <h2
                id="kova-install-title"
                className="text-xl font-semibold text-[#17211D]"
              >
                Open Kova like an app
              </h2>
            </div>
          </div>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Add Kova to your home screen for quick access, full-screen
              workspace, and staying signed in on this device.
            </p>

            {isIos && !canNativeInstall ? (
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#17211D]">
                <li>Tap the Share button in Safari</li>
                <li>Choose <span className="font-semibold">Add to Home Screen</span></li>
                <li>Tap <span className="font-semibold">Add</span></li>
              </ol>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={dismissForSession}
                className="px-4 py-3 text-sm font-medium text-gray-500 transition hover:text-[#17211D]"
              >
                Not now
              </button>

              {canNativeInstall ? (
                <button
                  type="button"
                  onClick={installApp}
                  className="bg-[#176B4D] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F]"
                >
                  Install app
                </button>
              ) : isIos ? (
                <button
                  type="button"
                  onClick={dismissForSession}
                  className="bg-[#176B4D] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F]"
                >
                  Got it
                </button>
              ) : (
                <button
                  type="button"
                  onClick={dismissForSession}
                  className="bg-[#176B4D] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F]"
                >
                  Continue in browser
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
