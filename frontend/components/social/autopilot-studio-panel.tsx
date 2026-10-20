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
      setError("Could not start a shift. Try again.");
    } finally {
      setStartingShift(false);
    }
  }

  const postItems = desk?.work?.posts ?? [];
  const shiftRunning = desk?.shift?.status === "running";
  const busy = startingShift || shiftRunning;

  return (
    <div className="rounded-lg border border-kova-orange/30 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-kova-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-kova-dark">Autopilot</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Kova drafts and schedules posts each shift.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void runShift()}
            className="inline-flex h-9 items-center rounded-md bg-kova-orange px-4 text-xs font-bold text-kova-dark hover:bg-[#f0a46e] disabled:opacity-60"
          >
            {busy ? "Running…" : "Run shift"}
          </button>
          <Link
            href="/workspace/social/calendar"
            className="inline-flex h-9 items-center rounded-md border border-kova-border px-4 text-xs font-semibold text-kova-dark hover:border-kova-green"
          >
            Calendar
          </Link>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3 sm:px-5">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : null}

        {busy ? (
          <p className="text-sm text-kova-dark">Shift in progress…</p>
        ) : null}

        {!loading && postItems.length > 0 ? (
          <ul className="space-y-1.5 text-sm">
            {postItems.slice(0, 4).map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-kova-border/80 px-3 py-2"
              >
                <p className="font-semibold text-kova-dark">{item.title}</p>
                {item.detail ? (
                  <p className="mt-0.5 text-xs text-gray-500">{item.detail}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
