"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Leads live under Inbox. */
export default function LeadsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/workspace/inbox?tab=leads");
  }, [router]);
  return null;
}
