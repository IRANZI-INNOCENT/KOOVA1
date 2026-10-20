"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { WORKSPACE_PAGE } from "@/components/ui/page-header";
import { AppShell } from "@/components/workspace/app-shell";
import { LeadsPanel } from "@/components/workspace/leads-panel";
import { MessageDesk } from "@/components/workspace/message-desk";

type Tab = "messages" | "leads";

function InboxInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("tab") === "leads" ? "leads" : "messages";
  const [tab, setTab] = useState<Tab>(initial);

  useEffect(() => {
    setTab(params.get("tab") === "leads" ? "leads" : "messages");
  }, [params]);

  const select = (next: Tab) => {
    setTab(next);
    const qs = next === "leads" ? "?tab=leads" : "";
    router.replace(`/workspace/inbox${qs}`);
  };

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="flex gap-1 border-b border-kova-border">
        {(
          [
            ["messages", "Messages"],
            ["leads", "Leads"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => select(id)}
            className={`border-b-2 px-3.5 py-2.5 text-sm font-medium transition ${
              tab === id
                ? "border-kova-orange text-kova-dark"
                : "border-transparent text-gray-400 hover:text-kova-dark"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "messages" ? (
          <MessageDesk channels={["instagram", "facebook"]} />
        ) : (
          <LeadsPanel />
        )}
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="p-8 text-sm text-gray-500">Loading inbox…</div>
        }
      >
        <InboxInner />
      </Suspense>
    </AppShell>
  );
}
