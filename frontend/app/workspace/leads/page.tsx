"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/workspace/app-shell";
import { useAuth } from "@/lib/auth-context";
import { getBusiness, getLeads, type Business, type Lead } from "@/lib/commerce";

export default function LeadsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !accessToken) { router.replace("/login"); return; }

    const token = accessToken;
    async function load() {
      try {
        const biz = await getBusiness(token);
        setBusiness(biz);
        const leadList = await getLeads(biz.id, token);
        setLeads(leadList);
      } catch {
        setError("Could not load leads.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authLoading, isAuthenticated, accessToken, router]);

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-gray-500">Loading leads…</p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="p-6 sm:p-8">
          <div className="border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const newLeads = leads.filter((l) => l.status === "new");
  const contactedLeads = leads.filter((l) => l.status === "contacted");

  return (
    <AppShell>
      <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-kova-dark">
                Leads
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {leads.length} lead{leads.length !== 1 ? "s" : ""} ·{" "}
                {newLeads.length} new · {contactedLeads.length} contacted
              </p>
            </div>
            <Link
              href="/workspace/kova"
              className="inline-flex items-center justify-center rounded-md bg-kova-green px-4 py-2 text-sm font-semibold text-white hover:bg-[#12583f]"
            >
              Ask Kova
            </Link>
          </div>

          {leads.length === 0 ? (
            <div className="mt-12 border border-kova-border bg-white p-8 text-center">
              <p className="text-lg font-semibold text-kova-dark">No leads yet</p>
              <p className="mt-2 text-sm text-gray-500">
                Kova captures leads from customer interactions. As people engage with your products, leads will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto border border-kova-border bg-white">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-kova-border bg-kova-background text-xs font-semibold uppercase tracking-wider text-gray-500">
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
                        <span className={`inline-block text-xs font-semibold uppercase tracking-wider ${
                          lead.status === "new" ? "text-kova-green" : "text-gray-500"
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {lead.source}
                        {lead.created_by_ai && (
                          <span className="ml-1.5 text-xs text-kova-green">AI</span>
                        )}
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
      </div>
    </AppShell>
  );
}
