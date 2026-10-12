"use client";

import { useState } from "react";

import { ApiError } from "@/lib/api";
import {
  assignPendingMetaPage,
  type PendingMetaPage,
} from "@/lib/social";
import type { Business } from "@/lib/business";

interface PendingMetaPagesPanelProps {
  pending: PendingMetaPage[];
  businesses: Business[];
  accessToken: string;
  onAssigned: (businessId: number) => void;
  onRefreshPending: () => Promise<void>;
}

export function PendingMetaPagesPanel({
  pending,
  businesses,
  accessToken,
  onAssigned,
  onRefreshPending,
}: PendingMetaPagesPanelProps) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [newNames, setNewNames] = useState<Record<number, string>>({});

  if (!pending.length) {
    return null;
  }

  async function assignNewBrain(item: PendingMetaPage) {
    const name = (newNames[item.id] || item.page_name || "").trim();
    if (!name) {
      setError("Name the new business brain for this Page.");
      return;
    }
    setBusyId(item.id);
    setError("");
    try {
      const result = await assignPendingMetaPage(item.id, accessToken, {
        new_business_name: name,
      });
      await onRefreshPending();
      onAssigned(result.business_id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not assign this Page to a brain.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function assignExisting(item: PendingMetaPage, businessId: number) {
    setBusyId(item.id);
    setError("");
    try {
      const result = await assignPendingMetaPage(item.id, accessToken, {
        business_id: businessId,
      });
      await onRefreshPending();
      onAssigned(result.business_id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not assign this Page to that brain.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const brainsWithoutPage = businesses.filter(
    (brain) => !brain.has_facebook_page,
  );

  return (
    <section className="rounded-lg border border-kova-orange/40 bg-kova-orange/5 p-5 space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-kova-orange">
          Needs a business brain
        </p>
        <h2 className="mt-1 text-base font-semibold text-kova-dark">
          Extra Facebook Pages stay inactive until assigned
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Each company needs its own brain (profile, brand, products). Your
          first Page stays on the brain you are viewing now. Connect each
          additional Page to a new or empty brain before Kova can post for it.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <ul className="space-y-4">
        {pending.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-kova-border bg-white p-4"
          >
            <p className="font-semibold text-kova-dark">
              {item.page_name || item.page_id}
            </p>
            {item.has_instagram && (
              <p className="mt-1 text-xs text-gray-500">
                Instagram @{item.instagram_username || "linked"} will connect
                with this Page.
              </p>
            )}
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-400">
              Inactive — not publishing
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-kova-dark">
                  Create a new brain for this company
                </label>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={newNames[item.id] ?? item.page_name ?? ""}
                    onChange={(event) =>
                      setNewNames((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    placeholder="Business name"
                    className="min-w-0 flex-1 rounded-md border border-kova-border px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void assignNewBrain(item)}
                    className="rounded-md bg-kova-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {busyId === item.id ? "Saving…" : "Create brain & activate"}
                  </button>
                </div>
              </div>

              {brainsWithoutPage.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-kova-dark">
                    Or attach to an existing brain without a Page
                  </label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {brainsWithoutPage.map((brain) => (
                      <button
                        key={brain.id}
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void assignExisting(item, brain.id)}
                        className="rounded-md border border-kova-border bg-kova-background px-3 py-1.5 text-xs font-semibold text-kova-dark hover:border-kova-orange disabled:opacity-60"
                      >
                        Use {brain.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
