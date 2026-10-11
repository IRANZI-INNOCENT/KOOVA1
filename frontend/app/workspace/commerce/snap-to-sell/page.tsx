"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
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
    (workspaceError ||
      !business ||
      !businessId ||
      !accessToken)
  ) {
    return (
      <WorkspacePageFrame loading={false}>
        <div className="p-6 sm:p-8">
          <div className="mx-auto max-w-5xl">
            <div className="border border-[#E5E7E5] bg-white p-8">
              <p className="text-sm font-semibold text-[#17211D]">
                Unable to open Snap-to-Sell
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {workspaceError ||
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
      </WorkspacePageFrame>
    );
  }

  return (
    <WorkspacePageFrame loading={workspaceLoading}>
      {!workspaceLoading &&
        businessId &&
        accessToken && (
          <SnapToSellModal
            open={true}
            onClose={handleClose}
            businessId={businessId}
            accessToken={accessToken}
            onCreated={handleCreated}
          />
        )}
    </WorkspacePageFrame>
  );
}
