"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { getBusiness, getLeads, type Lead } from "@/lib/commerce";

export function LeadsPanel() {
  const { accessToken } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    const token = accessToken;
    let cancelled = false;
    async function load() {
      try {
        const biz = await getBusiness(token);
        const leadList = await getLeads(biz.id, token);
        if (!cancelled) setLeads(leadList);
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
  }, [accessToken]);

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
      </p>

      {leads.length === 0 ? (
        <div className="mt-6 border border-kova-border bg-white px-5 py-6">
          <p className="font-semibold text-kova-dark">No leads yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Buying interest from messages appears here.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-kova-border bg-white">
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
      )}
    </div>
  );
}
