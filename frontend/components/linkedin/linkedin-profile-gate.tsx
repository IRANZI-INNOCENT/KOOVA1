"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { PageSkeleton } from "@/components/workspace/page-skeleton";
import { useAuth } from "@/lib/auth-context";
import { getProfessionalProfile } from "@/lib/professional";

const SETUP_PREFIX = "/workspace/linkedin/setup";

export function LinkedInProfileGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, isLoading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const onSetupRoute = pathname.startsWith(SETUP_PREFIX);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!accessToken) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    setChecking(true);

    getProfessionalProfile(accessToken)
      .then((profile) => {
        if (cancelled) {
          return;
        }
        const isReady = profile.profile_ready === true;
        setReady(isReady);

        if (!isReady && !onSetupRoute) {
          router.replace(SETUP_PREFIX);
        } else if (isReady && onSetupRoute) {
          router.replace("/workspace/linkedin");
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setReady(false);
        if (!onSetupRoute) {
          router.replace(SETUP_PREFIX);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setChecking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, authLoading, onSetupRoute, router, pathname]);

  if (authLoading || checking) {
    return <PageSkeleton />;
  }

  if (!ready && !onSetupRoute) {
    return null;
  }

  return <>{children}</>;
}
