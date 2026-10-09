"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { getBusiness, getLeads, type Lead } from "@/lib/commerce";

const SOCIAL = new Set(["instagram", "facebook", "whatsapp", "tiktok"]);

export default function SocialLeadsPage() {
  const { accessToken, isAuthenticated } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    const token = accessToken;
    getBusiness(token)
      .then((business) => getLeads(business.id, token))
      .then((list) => setLeads(list.filter((lead) => SOCIAL.has(lead.source))))
      .catch(() => setLeads([]));
  }, [accessToken, isAuthenticated]);

  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
            Social leads
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-kova-dark">
            Customers from social interactions
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            When a comment or message asks about price, delivery, or an order, Kova saves the person here.
          </p>
        </header>
        {leads.length === 0 ? (
          <p className="rounded-lg border border-dashed border-kova-orange/40 bg-kova-orange/5 px-4 py-8 text-center text-sm text-gray-500">
            Buying messages from Instagram, Facebook, and WhatsApp will appear as leads.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-kova-border bg-white">
            {leads.map((lead) => (
              <div key={lead.id} className="border-b border-kova-border px-4 py-3 last:border-b-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-kova-dark">
                    {lead.customer_name || "Customer"}
                  </p>
                  <span className="text-xs font-bold uppercase tracking-wide text-kova-orange">
                    {lead.source} · {lead.status}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-gray-600">{lead.interest}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
