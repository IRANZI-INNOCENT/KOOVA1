"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getAutopilot,
  startAutopilotShift,
  type AutopilotDesk,
} from "@/lib/social";

export function AutopilotStudioPanel({
  businessId,
  accessToken,
}: {
  businessId: number;
  accessToken: string;
}) {
  const [desk, setDesk] = useState<AutopilotDesk | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingShift, setStartingShift] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const next = await getAutopilot(businessId, accessToken);
      setDesk(next);
      setError("");
    } catch {
      setError("Could not load autopilot status.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [businessId, accessToken]);

  useEffect(() => {
    const key = `kova-create-autopilot-kick-${businessId}`;
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    startAutopilotShift(businessId, accessToken, false)
      .then(setDesk)
      .catch(() => undefined);
  }, [businessId, accessToken]);

  async function runShift() {
    setStartingShift(true);
    setError("");
    try {
      setDesk(await startAutopilotShift(businessId, accessToken, true));
    } catch {
      setError("Could not start a shift. Try again from Autopilot.");
    } finally {
      setStartingShift(false);
    }
  }

  const postItems = desk?.work?.posts ?? [];
  const shiftRunning = desk?.shift?.status === "running";
  const busy = startingShift || shiftRunning;

  return (
    <div className="overflow-hidden rounded-lg border border-kova-orange/35 bg-kova-orange/5">
      <div className="border-b border-kova-orange/25 px-5 py-4">
        <h2 className="text-sm font-bold text-kova-dark">
          Autopilot runs Create for you
        </h2>
        <p className="mt-1 text-xs leading-5 text-gray-600">
          Kova picks content seeds, features products, writes channel-specific
          posts, and publishes them on each shift — no manual brief needed.
        </p>
      </div>

      <div className="space-y-4 px-5 py-4">
        {loading && (
          <p className="text-sm text-gray-500">Checking the latest shift…</p>
        )}

        {busy && (
          <p className="flex items-center gap-2 text-sm font-medium text-kova-dark">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-kova-orange" />
            Kova is running a shift (seeds, products, publish)…
          </p>
        )}

        {!loading && postItems.length > 0 && (
          <ul className="space-y-2 text-sm">
            {postItems.slice(0, 4).map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-kova-border/80 bg-white px-3 py-2"
              >
                <p className="font-semibold text-kova-dark">{item.title}</p>
                {item.detail ? (
                  <p className="mt-0.5 text-xs text-gray-500">{item.detail}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => void runShift()}
            className="inline-flex h-9 items-center rounded-md bg-kova-orange px-4 text-xs font-bold text-kova-dark hover:bg-[#f0a46e] disabled:opacity-60"
          >
            {busy ? "Running shift…" : "Run shift now"}
          </button>
          <Link
            href="/workspace/social/autopilot"
            className="inline-flex h-9 items-center rounded-md border border-kova-border bg-white px-4 text-xs font-semibold text-kova-dark hover:border-kova-green"
          >
            Open Autopilot →
          </Link>
          <Link
            href="/workspace/social/calendar"
            className="inline-flex h-9 items-center text-xs font-semibold text-kova-green hover:underline"
          >
            Calendar
          </Link>
        </div>
      </div>
    </div>
  );
}
