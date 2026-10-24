"use client";

import { useState } from "react";

import { useWorkspaceOptional } from "@/lib/workspace-context";

export function BusinessSwitcher({ compact = false }: { compact?: boolean }) {
  const workspace = useWorkspaceOptional();
  if (!workspace) {
    return null;
  }
  const {
    business,
    businesses,
    workspaceLoading,
    setActiveBusinessId,
  } = workspace;
  const [busy, setBusy] = useState(false);

  if (workspaceLoading || !business || businesses.length <= 1) {
    return null;
  }

  async function onChange(nextId: number) {
    if (nextId === business?.id || busy) {
      return;
    }
    setBusy(true);
    try {
      await setActiveBusinessId(nextId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className={compact ? "mb-3 flex min-w-0 flex-col" : "hidden min-w-0 sm:flex sm:flex-col sm:items-end"}>
      <span className={`font-medium ${compact ? "text-xs text-gray-500" : "text-[10px] text-white/60"}`}>
        Business
      </span>
      <select
        value={business.id}
        disabled={busy}
        onChange={(event) => onChange(Number(event.target.value))}
        className={
          compact
            ? "mt-1 h-11 w-full rounded-md border border-kova-border bg-white px-2 text-sm font-semibold text-kova-dark outline-none"
            : "mt-0.5 max-w-[11rem] truncate rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold text-white outline-none focus:border-kova-orange"
        }
        aria-label="Switch business brain"
      >
        {businesses.map((item) => (
          <option key={item.id} value={item.id} className="text-kova-dark">
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}
