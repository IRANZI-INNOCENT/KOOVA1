"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Replies live in Inbox — one message desk. */
export default function SocialEngagementRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/workspace/inbox");
  }, [router]);
  return null;
}
