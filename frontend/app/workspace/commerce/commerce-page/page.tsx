"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy route — branding and storefront editing live under /storefront.
 */
export default function CommercePageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/workspace/commerce/storefront");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-kova-background">
      <p className="text-sm text-gray-500">Opening your storefront…</p>
    </main>
  );
}
