"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/workspace/app-shell";
import SnapToSellModal from "@/components/commerce/snap-to-sell-modal";
import { useAuth } from "@/lib/auth-context";
import { getBusiness, type Business } from "@/lib/commerce";

export default function SnapToSellPage() {
  const router = useRouter();

  const {
    accessToken,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated || !accessToken) {
      router.replace("/login");
      return;
    }

    const token = accessToken;

    async function loadBusiness() {
      try {
        setLoading(true);
        setError("");

        const currentBusiness = await getBusiness(token);

        setBusiness(currentBusiness);
      } catch (err) {
        console.error(
          "Kova Snap-to-Sell business loading failed:",
          err,
        );

        if (
          err instanceof Error &&
          err.message === "No business is configured."
        ) {
          router.replace("/workspace/setup");
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your business.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadBusiness();
  }, [
    authLoading,
    isAuthenticated,
    accessToken,
    router,
  ]);

  function handleCreated() {
    router.push("/workspace/commerce");
  }

  function handleClose() {
    router.push("/workspace/commerce");
  }

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="p-6 sm:p-8">
          <div className="mx-auto max-w-5xl">
            <div className="border border-[#E5E7E5] bg-white p-8">
              <p className="text-sm text-gray-500">
                Loading Snap-to-Sell...
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !business || !accessToken) {
    return (
      <AppShell>
        <div className="p-6 sm:p-8">
          <div className="mx-auto max-w-5xl">
            <div className="border border-[#E5E7E5] bg-white p-8">
              <p className="text-sm font-semibold text-[#17211D]">
                Unable to open Snap-to-Sell
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {error ||
                  "We could not load the business required for this workflow."}
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/workspace/commerce")
                }
                className="mt-6 border border-[#176B4D] bg-[#176B4D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F]"
              >
                Back to Commerce
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SnapToSellModal
        open={true}
        onClose={handleClose}
        businessId={business.id}
        accessToken={accessToken}
        onCreated={handleCreated}
      />
    </AppShell>
  );
}