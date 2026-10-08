"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/workspace/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, authenticatedApiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Business {
  id: number;
  name: string;
}

interface BusinessGoal {
  id: number;
  business: number;
  primary_goal: string;
  secondary_goals: string;
  growth_priorities: string;
  success_metrics: string;
  current_challenges: string;
  time_horizon: string;
}

type GoalForm = Omit<
  BusinessGoal,
  "id" | "business"
>;

type FieldErrors = Partial<
  Record<keyof GoalForm, string>
>;

const initialForm: GoalForm = {
  primary_goal: "",
  secondary_goals: "",
  growth_priorities: "",
  success_metrics: "",
  current_challenges: "",
  time_horizon: "",
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
      <label className="text-sm font-medium text-kova-dark">
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
          Example: {example}
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

export default function BusinessGoalsPage() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();

  const [form, setForm] = useState<GoalForm>(initialForm);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});
  const [success, setSuccess] = useState("");

  const updateField = <K extends keyof GoalForm>(
    field: K,
    value: GoalForm[K],
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

    if (!user || !accessToken) {
      router.replace("/login");
      return;
    }

    const token = accessToken;

    async function loadGoals() {
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

        const goals =
          await authenticatedApiRequest<BusinessGoal>(
            `/business-brain/${currentBusiness.id}/goals/`,
            token,
          );

        setForm({
          primary_goal: goals.primary_goal || "",
          secondary_goals: goals.secondary_goals || "",
          growth_priorities: goals.growth_priorities || "",
          success_metrics: goals.success_metrics || "",
          current_challenges: goals.current_challenges || "",
          time_horizon: goals.time_horizon || "",
        });
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError(
            "Unable to load your business goals.",
          );
        }
      } finally {
        setLoading(false);
      }
    }

    loadGoals();
  }, [authLoading, user, accessToken, router]);

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
      await authenticatedApiRequest<BusinessGoal>(
        `/business-brain/${business.id}/goals/`,
        accessToken,
        {
          method: "PATCH",
          body: JSON.stringify(form),
        },
      );

      setSuccess("Business goals saved successfully.");
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(getFieldErrors(err));
        setError(
          Object.keys(getFieldErrors(err)).length
            ? ""
            : err.message,
        );
      } else {
        setError(
          "Unable to save your business goals.",
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
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">
              Business Brain
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
              Define your business goals
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Tell Kova what your business is trying to
              achieve, where you want to grow, and how you
              measure success. This helps Kova make better
              decisions for your business.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-10 space-y-8"
          >
            <FormSection
              title="Business direction"
              description="Start with the outcomes that matter most to your business."
            >
              <TextareaField
                label="Primary goal"
                value={form.primary_goal}
                onChange={(value) =>
                  updateField("primary_goal", value)
                }
                placeholder="What is the most important thing your business wants to achieve?"
                example="Become a leading provider of affordable digital services for small businesses."
                error={fieldErrors.primary_goal}
              />

              <TextareaField
                label="Secondary goals"
                value={form.secondary_goals}
                onChange={(value) =>
                  updateField("secondary_goals", value)
                }
                placeholder="What other important outcomes do you want to achieve?"
                example="Grow our customer base, increase repeat purchases, and expand into new markets."
                error={fieldErrors.secondary_goals}
              />
            </FormSection>

            <FormSection
              title="Growth priorities"
              description="Tell Kova where the business should focus its growth efforts."
            >
              <TextareaField
                label="Growth priorities"
                value={form.growth_priorities}
                onChange={(value) =>
                  updateField("growth_priorities", value)
                }
                placeholder="Which products, markets, activities, or areas should receive the most attention?"
                example="Grow online sales, expand our product range, and reach more customers through social media."
                error={fieldErrors.growth_priorities}
              />
            </FormSection>

            <FormSection
              title="Measuring success"
              description="Describe how you will know whether the business is moving in the right direction."
            >
              <TextareaField
                label="Success metrics"
                value={form.success_metrics}
                onChange={(value) =>
                  updateField("success_metrics", value)
                }
                placeholder="What numbers or outcomes will tell you that the business is succeeding?"
                example="Monthly revenue, active customers, orders, repeat purchases, and social media leads."
                error={fieldErrors.success_metrics}
              />
            </FormSection>

            <FormSection
              title="Challenges and timeline"
              description="Help Kova understand what may prevent the business from reaching its goals."
            >
              <TextareaField
                label="Current challenges"
                value={form.current_challenges}
                onChange={(value) =>
                  updateField("current_challenges", value)
                }
                placeholder="What are the biggest problems or obstacles the business is facing?"
                example="Customer acquisition, limited marketing resources, and inconsistent sales."
                error={fieldErrors.current_challenges}
              />

              <div>
                <Input
                  label="Time horizon"
                  value={form.time_horizon}
                  onChange={(event) =>
                    updateField(
                      "time_horizon",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. 3–5 years"
                  className={`mt-2 ${
                    fieldErrors.time_horizon
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }`}
                />

                {fieldErrors.time_horizon ? (
                  <p className="mt-2 text-xs text-red-600">
                    {fieldErrors.time_horizon}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">
                    Example: 1 year, 3–5 years, or long term.
                  </p>
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
                Save business goals
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}