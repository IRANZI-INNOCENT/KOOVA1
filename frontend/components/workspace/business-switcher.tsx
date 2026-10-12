"use client";

import { useState } from "react";

import { useWorkspace } from "@/lib/workspace-context";

export function BusinessSwitcher() {
  const {
    business,
    businesses,
    workspaceLoading,
    setActiveBusinessId,
  } = useWorkspace();
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
    <label className="hidden min-w-0 sm:flex sm:flex-col sm:items-end">
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
        Business brain
      </span>
      <select
        value={business.id}
        disabled={busy}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-0.5 max-w-[11rem] truncate rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold text-white outline-none focus:border-kova-orange"
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
