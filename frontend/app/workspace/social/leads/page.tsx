"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Leads live in one place — avoid duplicating under Social. */
export default function SocialLeadsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/workspace/leads");
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8 text-sm text-gray-500">
      Opening Leads…
    </div>
  );
}
