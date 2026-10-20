"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Autopilot controls live on the Post hub. */
export default function AutopilotRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/workspace/social");
  }, [router]);
  return null;
}
