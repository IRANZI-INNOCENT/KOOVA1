"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { getProfessionalProfile } from "@/lib/professional";

const SETUP_PREFIX = "/workspace/linkedin/setup";
const CONNECT_PREFIX = "/workspace/linkedin/connect";

let profileReadyCache: boolean | null = null;

export function LinkedInProfileGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, isLoading: authLoading } = useAuth();
  const [checking, setChecking] = useState(profileReadyCache === null);
  const [ready, setReady] = useState(profileReadyCache === true);
  const onSetupRoute = pathname.startsWith(SETUP_PREFIX);
  const onConnectRoute = pathname.startsWith(CONNECT_PREFIX);
  const openWithoutProfile = onSetupRoute || onConnectRoute;

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!accessToken) {
      setChecking(false);
      return;
    }

    if (profileReadyCache === true) {
      setReady(true);
      setChecking(false);
      if (onSetupRoute) {
        router.replace("/workspace/linkedin");
      }
      return;
    }

    let cancelled = false;

    getProfessionalProfile(accessToken)
      .then((profile) => {
        if (cancelled) {
          return;
        }
        const isReady = profile.profile_ready === true;
        profileReadyCache = isReady;
        setReady(isReady);

        if (!isReady && !openWithoutProfile) {
          router.replace(SETUP_PREFIX);
        } else if (isReady && onSetupRoute) {
          router.replace("/workspace/linkedin");
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        profileReadyCache = false;
        setReady(false);
        if (!openWithoutProfile) {
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
  }, [accessToken, authLoading, onSetupRoute, openWithoutProfile, router, pathname]);

  if ((authLoading || checking) && profileReadyCache === null && !openWithoutProfile) {
    return null;
  }

  if (!ready && !openWithoutProfile) {
    return null;
  }

  return <>{children}</>;
}
