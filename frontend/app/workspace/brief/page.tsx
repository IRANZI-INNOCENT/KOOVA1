"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Morning brief lives on Overview now. */
export default function MorningBriefRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/workspace");
  }, [router]);
  return null;
}
