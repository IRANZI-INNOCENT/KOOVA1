"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BriefRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/workspace/analytics");
  }, [router]);
  return null;
}
