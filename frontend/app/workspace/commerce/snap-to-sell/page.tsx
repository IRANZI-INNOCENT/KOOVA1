"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { WORKSPACE_PAGE } from "@/components/ui/page-header";
import { useWorkspace } from "@/lib/workspace-context";

const SnapToSellModal = dynamic(
  () =>
    import("@/components/commerce/snap-to-sell-modal"),
  {
    ssr: false,
    loading: () => null,
  },
);

export default function SnapToSellPage() {
  const router = useRouter();
  const {
    business,
    businessId,
    accessToken,
    workspaceLoading,
    workspaceError,
  } = useWorkspace();

  function handleCreated() {
    router.push("/workspace/commerce");
  }

  function handleClose() {
    router.push("/workspace/commerce");
  }

  if (
    !workspaceLoading &&
    (workspaceError || !business || !businessId || !accessToken)
  ) {
    return (
      <div className={WORKSPACE_PAGE}>
        <p className="text-sm font-semibold text-kova-dark">
          Unable to open Snap to Sell
        </p>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          {workspaceError ||
            "We could not load the business required for this workflow."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/workspace/commerce")}
          className="mt-4 text-sm font-semibold text-kova-green hover:underline"
        >
          Back to Commerce →
        </button>
      </div>
    );
  }

  if (workspaceLoading) {
    return (
      <div className={WORKSPACE_PAGE}>
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    businessId &&
    accessToken && (
      <SnapToSellModal
        open={true}
        onClose={handleClose}
        businessId={businessId}
        accessToken={accessToken}
        onCreated={handleCreated}
      />
    )
  );
}
