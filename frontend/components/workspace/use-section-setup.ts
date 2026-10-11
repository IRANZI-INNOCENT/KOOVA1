"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ApiError, authenticatedApiRequest } from "@/lib/api";
import { nextSetupPath, type SetupSection } from "@/lib/setup-flow";

interface UseSectionSetupOptions<T> {
  section: SetupSection;
  businessId: number | null;
  accessToken: string | null;
  form: T;
  ready: boolean;
  save: (form: T) => Promise<void>;
}

export function useSectionSetup<T extends object>({
  section,
  businessId,
  accessToken,
  form,
  ready,
  save,
}: UseSectionSetupOptions<T>) {
  const searchParams = useSearchParams();
  const isSetup = searchParams.get("setup") === "1";
  const hydrated = useRef(false);
  const baseline = useRef("");
  const saveRef = useRef(save);
  saveRef.current = save;
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [autoState, setAutoState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!ready || !businessId || !accessToken) return;

    const serialized = JSON.stringify(form);
    if (!hydrated.current) {
      hydrated.current = true;
      baseline.current = serialized;
      return;
    }
    if (serialized === baseline.current) return;

    const timer = window.setTimeout(async () => {
      setAutoState("saving");
      try {
        await saveRef.current(form);
        baseline.current = serialized;
        setAutoState("saved");
      } catch {
        setAutoState("idle");
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [form, ready, businessId, accessToken]);

  async function draft(apply: (fields: Partial<T>) => void) {
    if (!businessId || !accessToken) return;
    setDrafting(true);
    setDraftError("");
    try {
      const fields = await authenticatedApiRequest<Partial<T>>(
        `/business-brain/${businessId}/draft/`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({ section }),
        },
      );
      apply(fields);
    } catch (err) {
      setDraftError(
        err instanceof ApiError
          ? err.message
          : "Kova could not draft this section.",
      );
    } finally {
      setDrafting(false);
    }
  }

  async function continueToNext(
    saveNow: () => Promise<unknown>,
    navigate: (path: string) => void,
  ) {
    if (!isSetup) {
      return false;
    }
    const path = nextSetupPath(section);
    if (!path) {
      return false;
    }
    await saveNow();
    navigate(path);
    return true;
  }

  return {
    isSetup,
    nextPath: nextSetupPath(section),
    continueToNext,
    drafting,
    draftError,
    autoState,
    draft,
  };
}
