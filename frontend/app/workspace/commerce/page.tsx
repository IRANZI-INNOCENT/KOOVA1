"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Shop opens on Products — Snap is a CTA there. */
export default function CommerceOverviewRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/workspace/commerce/products");
  }, [router]);
  return null;
}
