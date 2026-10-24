"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import {
  getBusinesses,
  pickActiveBusiness,
  setStoredActiveBusinessId,
  type Business as BrainBusiness,
} from "@/lib/business";
import {
  getCommercePage,
  getProducts,
  invalidateCommerceCaches,
  type Business,
} from "@/lib/commerce";

const WORKSPACE_PREFETCH_ROUTES = [
  "/workspace",
  "/workspace/kova",
  "/workspace/inbox",
  "/workspace/social",
  "/workspace/commerce",
  "/workspace/commerce/products",
  "/workspace/commerce/snap-to-sell",
  "/workspace/linkedin",
  "/workspace/linkedin/topic-week",
  "/workspace/linkedin/calendar",
] as const;

interface WorkspaceContextValue {
  business: Business | null;
  businessId: number | null;
  businesses: BrainBusiness[];
  accessToken: string | null;
  authLoading: boolean;
  isAuthenticated: boolean;
  workspaceLoading: boolean;
  workspaceError: string | null;
  refreshBusiness: () => Promise<void>;
  setActiveBusinessId: (businessId: number) => Promise<void>;
}

const WorkspaceContext =
  createContext<WorkspaceContextValue | undefined>(
    undefined,
  );

function prefetchWorkspaceData(
  businessId: number,
  token: string,
): void {
  void getProducts(businessId, token);
  void getCommercePage(businessId, token).catch(
    () => undefined,
  );
}

export function WorkspaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const {
    user,
    accessToken,
    isLoading: authLoading,
    isAuthenticated,
  } = useAuth();

  const [business, setBusiness] =
    useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<BrainBusiness[]>(
    [],
  );
  const [workspaceLoading, setWorkspaceLoading] =
    useState(true);
  const [workspaceError, setWorkspaceError] =
    useState<string | null>(null);

  const refreshBusiness = useCallback(async (): Promise<void> => {
    if (!accessToken || !user) {
      return;
    }

    setWorkspaceLoading(true);
    setWorkspaceError(null);

    try {
      const list = await getBusinesses(accessToken);
      setBusinesses(list);
      const picked = pickActiveBusiness(list);
      setBusiness({
        id: picked.id,
        name: picked.name,
        description: picked.description,
        industry: picked.industry,
        location: picked.location,
        email: picked.email,
        phone: picked.phone,
        created_at: picked.created_at,
        updated_at: picked.updated_at,
      });
      prefetchWorkspaceData(picked.id, accessToken);
    } catch (error) {
      setBusiness(null);
      setWorkspaceError(
        error instanceof Error
          ? error.message
          : "Could not load your business.",
      );
    } finally {
      setWorkspaceLoading(false);
    }
  }, [accessToken, user]);

  const setActiveBusinessId = useCallback(
    async (nextId: number): Promise<void> => {
      if (!accessToken || !user) {
        return;
      }
      setStoredActiveBusinessId(nextId);
      invalidateCommerceCaches(nextId, user.id);
      const match = businesses.find((item) => item.id === nextId);
      if (match) {
        setBusiness({
          id: match.id,
          name: match.name,
          description: match.description,
          industry: match.industry,
          location: match.location,
          email: match.email,
          phone: match.phone,
          created_at: match.created_at,
          updated_at: match.updated_at,
        });
        prefetchWorkspaceData(nextId, accessToken);
        return;
      }
      await refreshBusiness();
    },
    [accessToken, user, businesses, refreshBusiness],
  );

  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated || !user?.id) {
      setBusiness(null);
      setWorkspaceLoading(false);
      return;
    }

    let cancelled = false;

    async function loadWorkspace() {
      setWorkspaceLoading(true);
      setWorkspaceError(null);

      try {
        const token = accessTokenRef.current;

        if (!token) {
          return;
        }

        const list = await getBusinesses(token);
        if (cancelled) {
          return;
        }
        setBusinesses(list);
        if (!list.length) {
          setBusiness(null);
          return;
        }
        const picked = pickActiveBusiness(list);
        setBusiness({
          id: picked.id,
          name: picked.name,
          description: picked.description,
          industry: picked.industry,
          location: picked.location,
          email: picked.email,
          phone: picked.phone,
          created_at: picked.created_at,
          updated_at: picked.updated_at,
        });
        prefetchWorkspaceData(picked.id, token);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setBusiness(null);
        setWorkspaceError(
          error instanceof Error
            ? error.message
            : "Could not load your business.",
        );
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    isAuthenticated,
    user?.id,
  ]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    const timer = window.setTimeout(() => {
      for (const href of WORKSPACE_PREFETCH_ROUTES) {
        router.prefetch(href);
      }
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [authLoading, isAuthenticated, router]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      business,
      businessId: business?.id ?? null,
      accessToken,
      authLoading,
      isAuthenticated,
      workspaceLoading,
      workspaceError,
      refreshBusiness,
      businesses,
      setActiveBusinessId,
    }),
    [
      business,
      businesses,
      accessToken,
      authLoading,
      isAuthenticated,
      workspaceLoading,
      workspaceError,
      refreshBusiness,
      setActiveBusinessId,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error(
      "useWorkspace must be used inside WorkspaceProvider.",
    );
  }

  return context;
}

/** Safe for shell chrome that may render before nested providers mount. */
export function useWorkspaceOptional():
  | WorkspaceContextValue
  | undefined {
  return useContext(WorkspaceContext);
}
