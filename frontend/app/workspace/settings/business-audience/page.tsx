"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiError, authenticatedApiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SetupGuide } from "@/components/workspace/setup-guide";
import { useSectionSetup } from "@/components/workspace/use-section-setup";

interface Business {
  id: number;
  name: string;
}

interface BusinessAudience {
  id: number;
  business: number;
  primary_audience: string;
  customer_needs: string;
  pain_points: string;
  buying_motivations: string;
  customer_behavior: string;
  preferred_channels: string;
}

type AudienceForm = Omit<
  BusinessAudience,
  "id" | "business"
>;

type FieldErrors = Partial<
  Record<keyof AudienceForm, string>
>;

const initialForm: AudienceForm = {
  primary_audience: "",
  customer_needs: "",
  pain_points: "",
  buying_motivations: "",
  customer_behavior: "",
  preferred_channels: "",
};

interface TextareaFieldProps {
  label: string;
  value: string;
  placeholder: string;
  example?: string;
  error?: string;
  rows?: number;
  onChange: (value: string) => void;
}

function TextareaField({
  label,
  value,
  placeholder,
  example,
  error,
  rows = 5,
  onChange,
}: TextareaFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-kova-dark">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`mt-2 block w-full border bg-white px-4 py-3 text-sm text-kova-dark outline-none transition focus:ring-1 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-kova-border focus:border-kova-green focus:ring-kova-green"
        }`}
      />

      {error ? (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      ) : example ? (
        <p className="mt-2 text-xs text-gray-500">
          {example}
        </p>
      ) : null}
    </div>
  );
}

interface FormSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function FormSection({
  title,
  description,
  children,
}: FormSectionProps) {
  return (
    <section className="border border-kova-border bg-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-kova-dark">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-gray-500">
        {description}
      </p>

      <div className="mt-6 space-y-6">
        {children}
      </div>
    </section>
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

export default function BusinessAudiencePage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading: authLoading,
    accessToken,
  } = useAuth();

  const [business, setBusiness] =
    useState<Business | null>(null);
  const [form, setForm] =
    useState<AudienceForm>(initialForm);
  const [loading, setLoading] = useState(true);

  const setup = useSectionSetup({
    section: "audience",
    businessId: business?.id ?? null,
    accessToken,
    form,
    ready: !loading && !!business,
    save: async (current) => {
      if (!business || !accessToken) return;
      await authenticatedApiRequest(
        `/business-brain/${business.id}/audience/`,
        accessToken,
        { method: "PATCH", body: JSON.stringify(current) },
      );
    },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  const updateField = <K extends keyof AudienceForm>(
    field: K,
    value: AudienceForm[K],
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

    async function loadAudience() {
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

        const audience =
          await authenticatedApiRequest<BusinessAudience>(
            `/business-brain/${currentBusiness.id}/audience/`,
            token,
          );

        setForm({
          primary_audience:
            audience.primary_audience || "",
          customer_needs:
            audience.customer_needs || "",
          pain_points: audience.pain_points || "",
          buying_motivations:
            audience.buying_motivations || "",
          customer_behavior:
            audience.customer_behavior || "",
          preferred_channels:
            audience.preferred_channels || "",
        });
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "We couldn't load your business audience.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadAudience();
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

    setSaving(true);
    setError("");
    setSuccess("");
    setFieldErrors({});

    try {
      const saveAudience = () =>
        authenticatedApiRequest<BusinessAudience>(
          `/business-brain/${business.id}/audience/`,
          accessToken,
          {
            method: "PATCH",
            body: JSON.stringify(form),
          },
        );

      if (
        await setup.continueToNext(
          saveAudience,
          (path) => router.push(path),
        )
      ) {
        return;
      }

      await saveAudience();

      setSuccess(
        "Your customer audience has been updated.",
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
          "We couldn't save your changes. Please try again.",
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
          <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-3xl">
          <header>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">
              Business Brain
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
              Help Kova understand your customers
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Tell Kova who your business serves, what your
              customers need, and what influences their
              decisions. This information helps Kova create
              more relevant content, conversations, and sales
              experiences.
            </p>
          </header>

          <SetupGuide
            section="audience"
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
            <FormSection
              title="Who you serve"
              description="Describe the people or organizations that are most important to your business."
            >
              <TextareaField
                label="Primary audience"
                value={form.primary_audience}
                onChange={(value) =>
                  updateField("primary_audience", value)
                }
                placeholder="Who are your main customers?"
                example="Describe your customers naturally rather than trying to fit them into a demographic template."
                error={fieldErrors.primary_audience}
              />
            </FormSection>

            <FormSection
              title="Customer needs"
              description="Help Kova understand what your customers are trying to achieve."
            >
              <TextareaField
                label="What do your customers need?"
                value={form.customer_needs}
                onChange={(value) =>
                  updateField("customer_needs", value)
                }
                placeholder="What problems are customers trying to solve or what outcomes are they looking for?"
                error={fieldErrors.customer_needs}
              />
            </FormSection>

            <FormSection
              title="Customer pain points"
              description="Understanding customer frustrations helps Kova communicate with more relevance and empathy."
            >
              <TextareaField
                label="What challenges do your customers face?"
                value={form.pain_points}
                onChange={(value) =>
                  updateField("pain_points", value)
                }
                placeholder="What frustrates your customers or makes their current options difficult?"
                error={fieldErrors.pain_points}
              />
            </FormSection>

            <FormSection
              title="Why customers buy"
              description="Tell Kova what usually influences a customer to choose your business."
            >
              <TextareaField
                label="Buying motivations"
                value={form.buying_motivations}
                onChange={(value) =>
                  updateField("buying_motivations", value)
                }
                placeholder="What makes customers decide to buy?"
                error={fieldErrors.buying_motivations}
              />
            </FormSection>

            <FormSection
              title="Customer behavior"
              description="Describe how customers discover, evaluate, interact with, and purchase from your business."
            >
              <TextareaField
                label="How do customers behave?"
                value={form.customer_behavior}
                onChange={(value) =>
                  updateField("customer_behavior", value)
                }
                placeholder="How do customers discover you, research products, ask questions, and make purchases?"
                error={fieldErrors.customer_behavior}
              />
            </FormSection>

            <FormSection
              title="Preferred channels"
              description="Tell Kova where your customers are most likely to discover and communicate with your business."
            >
              <TextareaField
                label="Customer channels"
                value={form.preferred_channels}
                onChange={(value) =>
                  updateField("preferred_channels", value)
                }
                placeholder="e.g. Instagram, Facebook, WhatsApp, website"
                rows={3}
                error={fieldErrors.preferred_channels}
              />
            </FormSection>

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
                disabled={saving}
              >
                {setup.isSetup ? "Continue" : "Save customer audience"}
              </Button>
            </div>
          </form>
        </div>
      </div>
      );
}