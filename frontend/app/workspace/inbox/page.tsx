"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { WORKSPACE_PAGE } from "@/components/ui/page-header";
import { AppShell } from "@/components/workspace/app-shell";
import { LeadsPanel } from "@/components/workspace/leads-panel";
import { MessageDesk } from "@/components/workspace/message-desk";
import { getLeads } from "@/lib/commerce";
import { getSocialOverview } from "@/lib/social";
import { useWorkspace } from "@/lib/workspace-context";

type Tab = "messages" | "leads";

function InboxInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { businessId, accessToken, workspaceLoading } = useWorkspace();
  const requested = params.get("tab");
  const [tab, setTab] = useState<Tab>(
    requested === "leads" ? "leads" : "messages",
  );
  const [leadCount, setLeadCount] = useState(0);
  const [deadNames, setDeadNames] = useState<string[]>([]);

  useEffect(() => {
    if (requested === "leads" || requested === "messages") {
      setTab(requested);
      return;
    }
    if (workspaceLoading || !businessId || !accessToken) return;
    const token = accessToken;
    const bizId = businessId;
    let cancelled = false;
    getLeads(bizId, token)
      .then((leads) => {
        if (cancelled) return;
        if (new URLSearchParams(window.location.search).get("tab")) return;
        const next: Tab = leads.length > 0 ? "leads" : "messages";
        setLeadCount(leads.length);
        setTab(next);
        router.replace(`/workspace/inbox?tab=${next}`);
      })
      .catch(() => {
        if (!cancelled) setTab("messages");
      });
    return () => {
      cancelled = true;
    };
  }, [requested, workspaceLoading, businessId, accessToken, router]);

  useEffect(() => {
    if (workspaceLoading || !businessId || !accessToken) return;
    const token = accessToken;
    const bizId = businessId;
    let cancelled = false;
    Promise.all([
      getLeads(bizId, token).catch(() => []),
      getSocialOverview(bizId, token).catch(() => null),
    ]).then(([leads, social]) => {
      if (cancelled) return;
      setLeadCount(leads.length);
      setDeadNames(
        (social?.channels?.accounts ?? [])
          .filter((account) => !account.is_healthy)
          .map(
            (account) =>
              account.account_name ||
              account.account_username ||
              "Disconnected page",
          ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceLoading, businessId, accessToken]);

  const select = (next: Tab) => {
    setTab(next);
    router.replace(`/workspace/inbox?tab=${next}`);
  };

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="flex gap-1 border-b border-kova-border">
        {(
          [
            ["messages", "Messages"],
            ["leads", leadCount > 0 ? `Leads ${leadCount}` : "Leads"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => select(id)}
            className={`h-11 border-b-2 px-3.5 text-sm font-medium transition ${
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
          <MessageDesk
            channels={["instagram", "facebook"]}
            disconnectedAccounts={deadNames}
          />
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
          <div className="p-8" />
        }
      >
        <InboxInner />
      </Suspense>
    </AppShell>
  );
}
