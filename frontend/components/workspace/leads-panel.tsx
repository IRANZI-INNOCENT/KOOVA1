"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import {
  getLeads,
  markLeadFollowedUp,
  type Lead,
} from "@/lib/commerce";
import { useWorkspace } from "@/lib/workspace-context";

export function LeadsPanel() {
  const { accessToken } = useAuth();
  const { businessId: workspaceBusinessId, workspaceLoading } = useWorkspace();
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (workspaceLoading) return;
    if (!accessToken || !workspaceBusinessId) {
      setLoading(false);
      return;
    }
    const token = accessToken;
    const bizId = workspaceBusinessId;
    let cancelled = false;
    async function load() {
      try {
        const leadList = await getLeads(bizId, token);
        if (!cancelled) {
          setBusinessId(bizId);
          setLeads(leadList);
        }
      } catch {
        if (!cancelled) setError("Could not load leads.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, workspaceBusinessId, workspaceLoading]);

  const now = Date.now();
  const dueLeads = leads.filter((lead) => {
    if (["converted", "lost"].includes(lead.status)) return false;
    if (!lead.next_follow_up_at) return lead.status === "new";
    return new Date(lead.next_follow_up_at).getTime() <= now;
  });

  async function copyDraft(lead: Lead) {
    const text = lead.follow_up_draft?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Follow-up draft copied.");
    } catch {
      setError("Could not copy draft.");
    }
  }

  async function markDone(lead: Lead) {
    if (!accessToken || !businessId) return;
    try {
      const updated = await markLeadFollowedUp(businessId, lead.id, accessToken);
      setLeads((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice("Follow-up marked. Next reminder in 3 days.");
    } catch {
      setError("Could not update lead.");
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading leads…</p>;
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const newLeads = leads.filter((l) => l.status === "new");
  const contactedLeads = leads.filter((l) => l.status === "contacted");

  return (
    <div>
      <p className="text-sm text-gray-500">
        {leads.length} lead{leads.length !== 1 ? "s" : ""}
        {newLeads.length > 0 ? ` · ${newLeads.length} new` : ""}
        {contactedLeads.length > 0
          ? ` · ${contactedLeads.length} contacted`
          : ""}
        {dueLeads.length > 0 ? ` · ${dueLeads.length} due for follow-up` : ""}
      </p>
      {notice ? (
        <p className="mt-2 text-xs font-medium text-kova-green">{notice}</p>
      ) : null}

      {dueLeads.length > 0 ? (
        <div className="mt-4 space-y-2 border border-kova-border bg-white p-4">
          <p className="text-sm font-semibold text-kova-dark">Due follow-ups</p>
          {dueLeads.map((lead) => (
            <div
              key={`due-${lead.id}`}
              className="flex flex-wrap items-start justify-between gap-2 border-t border-kova-border pt-3 first:border-t-0 first:pt-0"
            >
              <div>
                <p className="text-sm font-medium text-kova-dark">
                  {lead.customer_name || lead.customer_id || "Lead"}
                </p>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                  {lead.follow_up_draft || lead.interest}
                </p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                {lead.follow_up_draft ? (
                  <button
                    type="button"
                    onClick={() => copyDraft(lead)}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-kova-border px-3 text-xs font-semibold text-kova-dark sm:flex-none"
                  >
                    Copy draft
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => markDone(lead)}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-kova-green px-3 text-xs font-bold text-white sm:flex-none"
                >
                  Done
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {leads.length === 0 ? (
        <div className="mt-6 border border-kova-border bg-white px-5 py-6">
          <p className="font-semibold text-kova-dark">No leads yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Buying interest from messages appears here.
          </p>
        </div>
      ) : (
        <>
        <ul className="mt-4 space-y-2 md:hidden">
          {leads.map((lead) => (
            <li key={lead.id} className="rounded-lg border border-kova-border bg-white p-4">
              <p className="text-sm font-semibold text-kova-dark">
                {lead.customer_name || "Lead"}
              </p>
              <p className="mt-1 break-all text-sm text-gray-600">
                {lead.customer_id || "No contact"}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                <span className={lead.status === "new" ? "font-semibold text-kova-green" : ""}>
                  {lead.status}
                </span>
                {" · "}
                {lead.source}
                {lead.created_by_ai ? " · AI" : ""}
                {" · "}
                {new Date(lead.created_at).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-4 hidden overflow-x-auto rounded-xl border border-kova-border bg-white md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-kova-border bg-kova-background text-xs font-medium text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kova-border">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-kova-background/50">
                  <td className="px-4 py-3 font-medium text-kova-dark">
                    {lead.customer_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {lead.customer_id || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium ${
                        lead.status === "new"
                          ? "text-kova-green"
                          : "text-gray-500"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {lead.source}
                    {lead.created_by_ai ? (
                      <span className="ml-1.5 text-xs text-kova-green">AI</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
