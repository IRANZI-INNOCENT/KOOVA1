"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { WORKSPACE_PAGE } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import {
  getBusiness,
  getCommercePage,
  publishCommercePage,
  saveCommercePage,
  type Business,
  type CommercePage,
} from "@/lib/commerce";
import { useAuth } from "@/lib/auth-context";

export default function CommercePageEditor() {
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [page, setPage] = useState<CommercePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (authLoading || !accessToken || !isAuthenticated) return;
    const token = accessToken;

    async function load() {
      try {
        const currentBusiness = await getBusiness(token);
        const currentPage = await getCommercePage(currentBusiness.id, token);
        setBusiness(currentBusiness);
        setPage(currentPage);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "We couldn't load your Commerce Page.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authLoading, accessToken, isAuthenticated]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!business || !page || !accessToken) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      setPage(await saveCommercePage(business.id, accessToken, page));
      setSuccess("Commerce Page saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't save the page.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (!business || !page || !accessToken) return;
    setPublishing(true);
    setError("");
    try {
      setPage(await publishCommercePage(business.id, accessToken, !page.is_published));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't update publication status.");
    } finally {
      setPublishing(false);
    }
  }

  if (authLoading || loading || !page) {
    return <main className="flex min-h-screen items-center justify-center bg-kova-background"><p className="text-sm text-gray-500">Loading Commerce Page...</p></main>;
  }

  return (
    <div className={WORKSPACE_PAGE}>
        <div className="mx-auto max-w-4xl">
          <Link href="/workspace/commerce/storefront" className="text-sm font-semibold text-kova-green">← Store</Link>
          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">Commerce Page</p>
              <h1 className="mt-3 text-3xl font-semibold text-kova-dark">Your business storefront</h1>
              <p className="mt-2 text-sm text-gray-500">This is the public commerce presence Kova can build around your business assets.</p>
            </div>
            <Button variant="secondary" onClick={togglePublish} loading={publishing}>
              {page.is_published ? "Unpublish" : "Publish Page"}
            </Button>
          </div>

          <form onSubmit={save} className="mt-10 space-y-6">
            <section className="border border-kova-border bg-white p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-kova-dark">Business presentation</h2>
              <div className="mt-6 space-y-5">
                <Input label="Page title" value={page.title} onChange={(e) => setPage({ ...page, title: e.target.value })} />
                <Input label="Tagline" value={page.tagline} onChange={(e) => setPage({ ...page, tagline: e.target.value })} placeholder="What should customers remember?" />
                <div>
                  <label className="block text-sm font-medium text-kova-dark">About the business</label>
                  <textarea value={page.description} onChange={(e) => setPage({ ...page, description: e.target.value })} rows={6} className="mt-2 w-full border border-kova-border px-4 py-3 text-sm" />
                </div>
              </div>
            </section>

            <section className="border border-kova-border bg-white p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-kova-dark">Customer contact</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Input label="WhatsApp" value={page.whatsapp} onChange={(e) => setPage({ ...page, whatsapp: e.target.value })} />
                <Input label="Phone" value={page.phone} onChange={(e) => setPage({ ...page, phone: e.target.value })} />
                <Input label="Email" type="email" value={page.email} onChange={(e) => setPage({ ...page, email: e.target.value })} />
                <Input label="Location" value={page.location} onChange={(e) => setPage({ ...page, location: e.target.value })} />
              </div>
            </section>

            {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {success && <div className="border border-kova-green/20 bg-kova-green/5 px-4 py-3 text-sm text-kova-green">{success}</div>}

            <div className="flex justify-end">
              <Button type="submit" loading={saving} disabled={saving}>Save Commerce Page</Button>
            </div>
          </form>

          <div className="mt-8 border border-kova-border bg-kova-background p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Public page</p>
            <p className="mt-2 text-sm text-kova-dark">
              {page.is_published
                ? `Published at /store/${page.slug}/`
                : "Publish the page to make it publicly accessible."}
            </p>
          </div>
        </div>
    </div>
  );
}
