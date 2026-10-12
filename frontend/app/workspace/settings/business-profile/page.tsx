"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, authenticatedApiRequest } from "@/lib/api";
import { pickActiveBusiness } from "@/lib/business";
import { useAuth } from "@/lib/auth-context";
import { SetupGuide } from "@/components/workspace/setup-guide";
import { useSectionSetup } from "@/components/workspace/use-section-setup";

interface Business {
  id: number;
  name: string;
}

interface BusinessProfile {
  id: number;
  business: number;
  mission: string;
  value_proposition: string;
  target_market: string;
  business_model: string;
  business_stage: string;
  website: string;
}

type ProfileForm = Omit<
  BusinessProfile,
  "id" | "business"
>;

type FieldErrors = Partial<
  Record<keyof ProfileForm, string>
>;

interface WebsiteScanResult {
  website: string;
  summary: string;
  suggestions: Partial<ProfileForm>;
  sources: { title: string; url: string; snippet: string }[];
}

const PROFILE_FIELD_LABELS: Record<keyof ProfileForm, string> = {
  mission: "Mission",
  value_proposition: "Value proposition",
  target_market: "Target market",
  business_model: "Business model",
  business_stage: "Business stage",
  website: "Website",
};

function normalizeWebsiteForSave(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.match(/^https?:\/\//i)
    ? trimmed
    : `https://${trimmed}`;
}

function looksLikeWebsite(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = trimmed.match(/^https?:\/\//i)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(url);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

const initialForm: ProfileForm = {
  mission: "",
  value_proposition: "",
  target_market: "",
  business_model: "",
  business_stage: "",
  website: "",
};

interface TextareaFieldProps {
  label: string;
  value: string;
  placeholder: string;
  example?: string;
  error?: string;
  onChange: (value: string) => void;
}

function TextareaField({
  label,
  value,
  placeholder,
  example,
  error,
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
        rows={4}
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

export default function BusinessProfilePage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading: authLoading,
    accessToken,
  } = useAuth();

  const [business, setBusiness] =
    useState<Business | null>(null);
  const [form, setForm] =
    useState<ProfileForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanResult, setScanResult] =
    useState<WebsiteScanResult | null>(null);
  const lastScannedWebsite = useRef("");

  const setup = useSectionSetup({
    section: "profile",
    businessId: business?.id ?? null,
    accessToken,
    form,
    ready: !loading && !!business,
    save: async (current) => {
      if (!business || !accessToken) return;
      await authenticatedApiRequest(
        `/business-brain/${business.id}/profile/`,
        accessToken,
        {
          method: "PATCH",
          body: JSON.stringify(current),
        },
      );
    },
  });

  const updateField = <K extends keyof ProfileForm>(
    field: K,
    value: ProfileForm[K],
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
    if (field === "website") {
      setScanResult(null);
      setScanError("");
    }
  };

  async function scanWebsite(urlOverride?: string) {
    if (!business || !accessToken) return;

    const candidate = (urlOverride ?? form.website).trim();
    if (!looksLikeWebsite(candidate)) {
      setScanError(
        "Enter a public website address before Kova can scan it.",
      );
      return;
    }

    setScanning(true);
    setScanError("");
    setScanResult(null);
    setSuccess("");

    try {
      const result =
        await authenticatedApiRequest<WebsiteScanResult>(
          `/business-brain/${business.id}/profile/scan-website/`,
          accessToken,
          {
            method: "POST",
            body: JSON.stringify({ website: candidate }),
          },
        );
      lastScannedWebsite.current = result.website;
      setScanResult(result);
      if (result.website && result.website !== form.website) {
        setForm((current) => ({
          ...current,
          website: result.website,
        }));
      }
    } catch (err) {
      setScanError(
        err instanceof ApiError
          ? err.message
          : "Kova could not scan that website. Try again in a moment.",
      );
    } finally {
      setScanning(false);
    }
  }

  function applyScanSuggestions() {
    if (!scanResult?.suggestions) return;
    setForm((current) => {
      const next = { ...current };
      for (const key of Object.keys(
        scanResult.suggestions,
      ) as (keyof ProfileForm)[]) {
        const value = scanResult.suggestions[key];
        if (typeof value === "string" && value.trim()) {
          next[key] = value.trim();
        }
      }
      return next;
    });
    setSuccess(
      "Kova applied the suggested fields. Review them, then save when you are ready.",
    );
    setScanError("");
  }

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !accessToken) {
      router.replace("/login");
      return;
    }

    const token = accessToken;

    async function loadProfile() {
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

        const currentBusiness = pickActiveBusiness(businesses);
        setBusiness(currentBusiness);

        const profile =
          await authenticatedApiRequest<BusinessProfile>(
            `/business-brain/${currentBusiness.id}/profile/`,
            token,
          );

        setForm({
          mission: profile.mission || "",
          value_proposition:
            profile.value_proposition || "",
          target_market: profile.target_market || "",
          business_model: profile.business_model || "",
          business_stage: profile.business_stage || "",
          website: profile.website || "",
        });
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "We couldn't load your business profile.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
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

    const payload = {
      ...form,
      website: normalizeWebsiteForSave(form.website),
    };

    try {
      const saveProfile = () =>
        authenticatedApiRequest<BusinessProfile>(
          `/business-brain/${business.id}/profile/`,
          accessToken,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          },
        );

      const continued = await setup.continueToNext(
        saveProfile,
        (path) => router.push(path),
      );
      if (continued) {
        return;
      }

      await saveProfile();
      setForm(payload);
      setSuccess(
        "Your business profile has been updated.",
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
              Tell Kova about your business
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              This information helps Kova understand your
              business, your customers, and what makes you
              different. You can update it as your business
              evolves.
            </p>
          </header>

          <SetupGuide
            section="profile"
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
              title="Business identity"
              description="Help Kova understand why your business exists and the value it provides."
            >
              <TextareaField
                label="Mission"
                value={form.mission}
                onChange={(value) =>
                  updateField("mission", value)
                }
                placeholder="Why does your business exist?"
                example="Example: We help young professionals find affordable, quality clothing."
                error={fieldErrors.mission}
              />

              <TextareaField
                label="Value proposition"
                value={form.value_proposition}
                onChange={(value) =>
                  updateField("value_proposition", value)
                }
                placeholder="Why should customers choose your business?"
                error={fieldErrors.value_proposition}
              />
            </FormSection>

            <FormSection
              title="Customers and market"
              description="Help Kova understand who your business is trying to reach."
            >
              <TextareaField
                label="Target market"
                value={form.target_market}
                onChange={(value) =>
                  updateField("target_market", value)
                }
                placeholder="Who are your main customers?"
                example="You can describe your customers naturally. Kova will use this information when helping with content and marketing decisions."
                error={fieldErrors.target_market}
              />
            </FormSection>

            <FormSection
              title="Business model"
              description="Give Kova some context about how the business operates."
            >
              <div className="grid gap-6 sm:grid-cols-2">
                <Input
                  label="Business model"
                  value={form.business_model}
                  onChange={(event) =>
                    updateField(
                      "business_model",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Retail, subscription, services"
                />

                <Input
                  label="Business stage"
                  value={form.business_stage}
                  onChange={(event) =>
                    updateField(
                      "business_stage",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. New, growing, established"
                />
              </div>

              <div>
                <Input
                  label="Website"
                  type="url"
                  value={form.website}
                  onChange={(event) =>
                    updateField(
                      "website",
                      event.target.value,
                    )
                  }
                  onBlur={(event) => {
                    const value = event.target.value.trim();
                    if (
                      !looksLikeWebsite(value) ||
                      value === lastScannedWebsite.current ||
                      scanning
                    ) {
                      return;
                    }
                    void scanWebsite(value);
                  }}
                  placeholder="https://example.com"
                />

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  When you add your site, Kova scans it and suggests
                  updates for mission, customers, business model, and
                  stage. You review every field before saving.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={scanning || !looksLikeWebsite(form.website)}
                    onClick={() => void scanWebsite()}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-kova-border bg-white px-4 text-sm font-semibold text-kova-dark hover:bg-kova-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {scanning ? "Scanning website..." : "Scan website"}
                  </button>
                </div>

                {scanError && (
                  <p className="mt-3 text-sm text-red-700">{scanError}</p>
                )}

                {scanResult && (
                  <div className="mt-4 border border-kova-green/25 bg-kova-green/5 p-4">
                    <p className="text-sm leading-6 text-kova-dark">
                      {scanResult.summary}
                    </p>

                    <ul className="mt-4 space-y-3">
                      {(
                        Object.keys(scanResult.suggestions) as (keyof ProfileForm)[]
                      )
                        .filter(
                          (key) =>
                            key !== "website" &&
                            scanResult.suggestions[key]?.trim(),
                        )
                        .map((key) => (
                          <li key={key}>
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                              {PROFILE_FIELD_LABELS[key]}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-kova-dark">
                              {scanResult.suggestions[key]}
                            </p>
                          </li>
                        ))}
                    </ul>

                    {scanResult.sources.length > 0 && (
                      <p className="mt-4 text-xs text-gray-500">
                        Source:{" "}
                        <a
                          href={scanResult.sources[0].url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-kova-green underline"
                        >
                          {scanResult.sources[0].title ||
                            scanResult.sources[0].url}
                        </a>
                      </p>
                    )}

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={applyScanSuggestions}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-kova-green px-4 text-sm font-semibold text-white hover:bg-[#2d6a52]"
                      >
                        Apply suggestions to form
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                {setup.isSetup ? "Continue" : "Save business profile"}
              </Button>
            </div>
          </form>
        </div>
      </div>
      );
}