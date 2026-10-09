"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/workspace/app-shell";
import { Button } from "@/components/ui/button";
import { ApiError, authenticatedApiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SetupGuide } from "@/components/workspace/setup-guide";
import { useSectionSetup } from "@/components/workspace/use-section-setup";

interface Business {
  id: number;
  name: string;
}

interface BusinessBrand {
  id: number;
  business: number;
  voice: string;
  tone: string;
  positioning: string;
  brand_personality: string;
  content_style: string;
  communication_preferences: string;
}

type BrandForm = Omit<BusinessBrand, "id" | "business">;

type FieldErrors = Partial<
  Record<keyof BrandForm, string>
>;

const initialForm: BrandForm = {
  voice: "",
  tone: "",
  positioning: "",
  brand_personality: "",
  content_style: "",
  communication_preferences: "",
};

interface BrandFieldProps {
  label: string;
  description: string;
  value: string;
  placeholder: string;
  error?: string;
  onChange: (value: string) => void;
}

function BrandField({
  label,
  description,
  value,
  placeholder,
  error,
  onChange,
}: BrandFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-kova-dark">
        {label}
      </label>

      <p className="mt-1 text-sm leading-6 text-gray-500">
        {description}
      </p>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className={`mt-3 block w-full resize-y border bg-white px-4 py-3 text-sm leading-6 text-kova-dark outline-none transition focus:ring-1 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-kova-border focus:border-kova-green focus:ring-kova-green"
        }`}
      />

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function isComplete(form: BrandForm) {
  return Object.values(form).every(
    (value) => value.trim() !== "",
  );
}

function getFieldErrors(error: ApiError): FieldErrors {
  if (
    !error.details ||
    typeof error.details !== "object"
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(error.details).map(
      ([field, value]) => [
        field,
        Array.isArray(value)
          ? String(value[0])
          : String(value),
      ],
    ),
  ) as FieldErrors;
}

export default function BusinessBrandPage() {
  const router = useRouter();

  const {
    accessToken,
    isLoading: authLoading,
    isAuthenticated,
  } = useAuth();

  const [business, setBusiness] =
    useState<Business | null>(null);
  const [form, setForm] =
    useState<BrandForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  const setup = useSectionSetup({
    section: "brand",
    businessId: business?.id ?? null,
    accessToken,
    form,
    ready: !loading && !!business,
    save: async (current) => {
      if (!business || !accessToken) return;
      await authenticatedApiRequest(
        `/business-brain/${business.id}/brand/`,
        accessToken,
        { method: "PATCH", body: JSON.stringify(current) },
      );
    },
  });

  const updateField = <K extends keyof BrandForm>(
    field: K,
    value: BrandForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setError("");
    setSuccess("");
  };

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !accessToken) {
      router.replace("/login");
      return;
    }

    const token = accessToken;

    async function loadBrand() {
      try {
        const businesses =
          await authenticatedApiRequest<Business[]>(
            "/businesses/",
            token,
          );

        if (!businesses.length) {
          router.replace("/workspace/setup");
          return;
        }

        const currentBusiness = businesses[0];
        setBusiness(currentBusiness);

        const brand =
          await authenticatedApiRequest<BusinessBrand>(
            `/business-brain/${currentBusiness.id}/brand/`,
            token,
          );

        setForm({
          voice: brand.voice || "",
          tone: brand.tone || "",
          positioning: brand.positioning || "",
          brand_personality:
            brand.brand_personality || "",
          content_style: brand.content_style || "",
          communication_preferences:
            brand.communication_preferences || "",
        });
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load your business brand.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadBrand();
  }, [
    authLoading,
    isAuthenticated,
    accessToken,
    router,
  ]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!business || !accessToken) return;

    if (!isComplete(form)) {
      setError(
        "Please complete all brand fields before saving.",
      );
      setSuccess("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    setFieldErrors({});

    try {
      await authenticatedApiRequest<BusinessBrand>(
        `/business-brain/${business.id}/brand/`,
        accessToken,
        {
          method: "PATCH",
          body: JSON.stringify(
            Object.fromEntries(
              Object.entries(form).map(
                ([key, value]) => [
                  key,
                  value.trim(),
                ],
              ),
            ),
          ),
        },
      );

      if (setup.isSetup && setup.nextPath) {
        router.push(setup.nextPath);
        return;
      }

      setSuccess(
        "Business brand saved successfully.",
      );
    } catch (err) {
      if (err instanceof ApiError) {
        const errors = getFieldErrors(err);

        setFieldErrors(errors);
        setError(
          Object.keys(errors).length
            ? ""
            : err.message,
        );
      } else {
        setError(
          "Unable to save your business brand.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-kova-background">
        <p className="text-sm text-gray-500">
          Loading your workspace...
        </p>
      </main>
    );
  }

  return (
    <AppShell>
      <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-3xl">
          <header>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">
              Business Brain
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
              Define your business brand
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Tell Kova how your business should sound,
              communicate, and present itself when creating
              content or interacting with customers.
            </p>
          </header>

          <SetupGuide
            section="brand"
            isSetup={setup.isSetup}
            autoState={setup.autoState}
            drafting={setup.drafting}
            draftError={setup.draftError}
            onDraft={() =>
              setup.draft((fields) =>
                setForm((current) => ({ ...current, ...fields })),
              )
            }
          />

          <form
            onSubmit={handleSubmit}
            className="mt-10 space-y-8"
          >
            <section className="border border-kova-border bg-white p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-kova-dark">
                Communication identity
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Give Kova a consistent way to communicate
                on behalf of your business.
              </p>

              <div className="mt-6 space-y-6">
                <BrandField
                  label="Voice"
                  description="What should the consistent character of the business sound like?"
                  value={form.voice}
                  onChange={(value) =>
                    updateField("voice", value)
                  }
                  placeholder="For example: Clear, practical, confident and human."
                  error={fieldErrors.voice}
                />

                <BrandField
                  label="Tone"
                  description="How should the business sound when communicating with customers?"
                  value={form.tone}
                  onChange={(value) =>
                    updateField("tone", value)
                  }
                  placeholder="For example: Friendly, encouraging and professional without sounding overly formal or salesy."
                  error={fieldErrors.tone}
                />

                <BrandField
                  label="Positioning"
                  description="How should customers perceive the business compared with alternatives?"
                  value={form.positioning}
                  onChange={(value) =>
                    updateField("positioning", value)
                  }
                  placeholder="For example: A practical and trustworthy platform that helps students discover opportunities and participate in the digital economy."
                  error={fieldErrors.positioning}
                />

                <BrandField
                  label="Brand personality"
                  description="What human characteristics should Kova reflect when representing the business?"
                  value={form.brand_personality}
                  onChange={(value) =>
                    updateField(
                      "brand_personality",
                      value,
                    )
                  }
                  placeholder="For example: Helpful, youthful, ambitious, practical, inclusive and trustworthy."
                  error={fieldErrors.brand_personality}
                />

                <BrandField
                  label="Content style"
                  description="What should the business's content generally feel and look like in writing?"
                  value={form.content_style}
                  onChange={(value) =>
                    updateField(
                      "content_style",
                      value,
                    )
                  }
                  placeholder="For example: Simple, direct, useful and action-oriented, with clear explanations and practical next steps."
                  error={fieldErrors.content_style}
                />

                <BrandField
                  label="Communication preferences"
                  description="Are there additional communication preferences Kova should follow?"
                  value={
                    form.communication_preferences
                  }
                  onChange={(value) =>
                    updateField(
                      "communication_preferences",
                      value,
                    )
                  }
                  placeholder="For example: Use accessible English, avoid unnecessary jargon and exaggerated claims, and never invent information."
                  error={
                    fieldErrors.communication_preferences
                  }
                />
              </div>
            </section>

            {error && (
              <div
                role="alert"
                className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="border border-kova-green/20 bg-kova-green/5 px-4 py-3 text-sm text-kova-green"
              >
                {success}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                loading={saving}
                disabled={saving || !isComplete(form)}
              >
                {setup.isSetup ? "Continue" : "Save business brand"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}