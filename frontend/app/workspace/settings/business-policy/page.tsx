"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authenticatedApiRequest, ApiError } from "@/lib/api";
import { pickActiveBusiness } from "@/lib/business";
import { useAuth } from "@/lib/auth-context";
import { SetupGuide } from "@/components/workspace/setup-guide";
import { useSectionSetup } from "@/components/workspace/use-section-setup";

interface BusinessPolicy {
  id: number;
  business: number;

  allow_content_creation: boolean;
  allow_auto_publish: boolean;
  allow_comment_replies: boolean;
  allow_dm_replies: boolean;
  allow_lead_creation: boolean;
  allow_product_management: boolean;
  allow_order_management: boolean;

  require_discount_approval: boolean;
  max_auto_discount_percent: string | number;
  require_refund_approval: boolean;
  require_payment_approval: boolean;

  facebook_max_posts_per_day: number;
  facebook_max_posts_per_week: number;
  instagram_max_posts_per_day: number;
  instagram_max_posts_per_week: number;
  min_hours_between_posts: number;

  created_at: string;
  updated_at: string;
}

interface PolicyForm {
  allow_content_creation: boolean;
  allow_auto_publish: boolean;
  allow_comment_replies: boolean;
  allow_dm_replies: boolean;
  allow_lead_creation: boolean;
  allow_product_management: boolean;
  allow_order_management: boolean;

  require_discount_approval: boolean;
  max_auto_discount_percent: string;
  require_refund_approval: boolean;
  require_payment_approval: boolean;

  facebook_max_posts_per_day: string;
  facebook_max_posts_per_week: string;
  instagram_max_posts_per_day: string;
  instagram_max_posts_per_week: string;
  min_hours_between_posts: string;
}

const initialForm: PolicyForm = {
  allow_content_creation: true,
  allow_auto_publish: false,
  allow_comment_replies: false,
  allow_dm_replies: false,
  allow_lead_creation: true,
  allow_product_management: false,
  allow_order_management: false,

  require_discount_approval: true,
  max_auto_discount_percent: "20",
  require_refund_approval: true,
  require_payment_approval: true,

  facebook_max_posts_per_day: "2",
  facebook_max_posts_per_week: "10",
  instagram_max_posts_per_day: "1",
  instagram_max_posts_per_week: "5",
  min_hours_between_posts: "4",
};

const CADENCE_FIELDS = [
  "facebook_max_posts_per_day",
  "facebook_max_posts_per_week",
  "instagram_max_posts_per_day",
  "instagram_max_posts_per_week",
  "min_hours_between_posts",
] as const;

function getFieldErrors(details: unknown, field: string): string[] {
  if (!details || typeof details !== "object") {
    return [];
  }

  const value = (details as Record<string, unknown>)[field];

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}

interface PolicyToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function PolicyToggle({
  label,
  description,
  checked,
  onChange,
}: PolicyToggleProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#17211D]">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        ) : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#176B4D]" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

interface PolicySectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function PolicySection({
  title,
  description,
  children,
}: PolicySectionProps) {
  return (
    <section className="rounded-lg border border-[#E5E7E5] bg-white">
      <div className="border-b border-[#E5E7E5] px-5 py-3.5">
        <h2 className="text-sm font-semibold text-[#17211D]">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        ) : null}
      </div>

      <div className="divide-y divide-[#E5E7E5] px-5">{children}</div>
    </section>
  );
}

interface CadenceNumberProps {
  id: string;
  label: string;
  hint: string;
  value: string;
  min: number;
  max: number;
  errors?: string[];
  onChange: (value: string) => void;
}

function CadenceNumber({
  id,
  label,
  hint,
  value,
  min,
  max,
  errors,
  onChange,
}: CadenceNumberProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-[#17211D]"
      >
        {label}
      </label>
      {hint ? (
        <p className="mt-0.5 text-xs text-gray-500">{hint}</p>
      ) : null}
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-28 rounded-lg border border-[#E5E7E5] bg-white px-3 py-2 text-sm text-[#17211D] outline-none transition focus:border-[#176B4D] focus:ring-2 focus:ring-[#176B4D]/10"
      />
      {errors?.map((message) => (
        <p key={message} className="mt-2 text-sm text-red-600">
          {message}
        </p>
      ))}
    </div>
  );
}

export default function BusinessPolicyPage() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();

  const [businessId, setBusinessId] = useState<number | null>(null);
  const [form, setForm] = useState<PolicyForm>(initialForm);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[]>
  >({});

  const setup = useSectionSetup({
    section: "policy",
    businessId,
    accessToken,
    form,
    ready: !isLoading && businessId !== null,
    save: async (current) => {
      if (!accessToken || !businessId) return;
      const discount = Number(current.max_auto_discount_percent);
      if (Number.isNaN(discount)) {
        throw new Error("Enter a valid discount.");
      }
      await authenticatedApiRequest(
        `/business-brain/${businessId}/policy/`,
        accessToken,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...current,
            max_auto_discount_percent: discount,
            facebook_max_posts_per_day: Number(
              current.facebook_max_posts_per_day,
            ),
            facebook_max_posts_per_week: Number(
              current.facebook_max_posts_per_week,
            ),
            instagram_max_posts_per_day: Number(
              current.instagram_max_posts_per_day,
            ),
            instagram_max_posts_per_week: Number(
              current.instagram_max_posts_per_week,
            ),
            min_hours_between_posts: Number(
              current.min_hours_between_posts,
            ),
          }),
        },
      );
    },
  });

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!accessToken) {
      return;
    }

    const loadPolicy = async () => {
      try {
        setError("");

        const businesses = await authenticatedApiRequest<
          Array<{ id: number }>
        >("/businesses/", accessToken);

        if (businesses.length === 0) {
          router.replace("/workspace/setup");
          return;
        }

        const currentBusinessId = pickActiveBusiness(businesses).id;
        setBusinessId(currentBusinessId);

        const policy =
          await authenticatedApiRequest<BusinessPolicy>(
            `/business-brain/${currentBusinessId}/policy/`,
            accessToken,
          );

        setForm({
          allow_content_creation: policy.allow_content_creation,
          allow_auto_publish: policy.allow_auto_publish,
          allow_comment_replies: policy.allow_comment_replies,
          allow_dm_replies: policy.allow_dm_replies,
          allow_lead_creation: policy.allow_lead_creation,
          allow_product_management: policy.allow_product_management,
          allow_order_management: policy.allow_order_management,

          require_discount_approval:
            policy.require_discount_approval,
          max_auto_discount_percent:
            String(policy.max_auto_discount_percent),
          require_refund_approval:
            policy.require_refund_approval,
          require_payment_approval:
            policy.require_payment_approval,

          facebook_max_posts_per_day: String(
            policy.facebook_max_posts_per_day ?? 2,
          ),
          facebook_max_posts_per_week: String(
            policy.facebook_max_posts_per_week ?? 10,
          ),
          instagram_max_posts_per_day: String(
            policy.instagram_max_posts_per_day ?? 1,
          ),
          instagram_max_posts_per_week: String(
            policy.instagram_max_posts_per_week ?? 5,
          ),
          min_hours_between_posts: String(
            policy.min_hours_between_posts ?? 4,
          ),
        });
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Unable to load your business policies.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPolicy();
  }, [accessToken, authLoading, router, user]);

  const updateToggle = (
    field: keyof PolicyForm,
    value: boolean,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccess("");
    setError("");
  };

  const updateDiscount = (value: string) => {
    setForm((current) => ({
      ...current,
      max_auto_discount_percent: value,
    }));

    setSuccess("");
    setError("");

    setFieldErrors((current) => ({
      ...current,
      max_auto_discount_percent: [],
    }));
  };

  const updateCadence = (
    field: (typeof CADENCE_FIELDS)[number],
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setSuccess("");
    setError("");
    setFieldErrors((current) => ({
      ...current,
      [field]: [],
    }));
  };

  const formFromPolicy = (policy: BusinessPolicy): PolicyForm => ({
    allow_content_creation: policy.allow_content_creation,
    allow_auto_publish: policy.allow_auto_publish,
    allow_comment_replies: policy.allow_comment_replies,
    allow_dm_replies: policy.allow_dm_replies,
    allow_lead_creation: policy.allow_lead_creation,
    allow_product_management: policy.allow_product_management,
    allow_order_management: policy.allow_order_management,
    require_discount_approval: policy.require_discount_approval,
    max_auto_discount_percent: String(policy.max_auto_discount_percent),
    require_refund_approval: policy.require_refund_approval,
    require_payment_approval: policy.require_payment_approval,
    facebook_max_posts_per_day: String(
      policy.facebook_max_posts_per_day ?? 2,
    ),
    facebook_max_posts_per_week: String(
      policy.facebook_max_posts_per_week ?? 10,
    ),
    instagram_max_posts_per_day: String(
      policy.instagram_max_posts_per_day ?? 1,
    ),
    instagram_max_posts_per_week: String(
      policy.instagram_max_posts_per_week ?? 5,
    ),
    min_hours_between_posts: String(
      policy.min_hours_between_posts ?? 4,
    ),
  });

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!accessToken || !businessId) {
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");
    setFieldErrors({});

    try {
      const discount = Number(form.max_auto_discount_percent);

      if (
        form.max_auto_discount_percent.trim() === "" ||
        Number.isNaN(discount)
      ) {
        setFieldErrors({
          max_auto_discount_percent: [
            "Enter a valid maximum automatic discount.",
          ],
        });
        return;
      }

      if (discount < 0 || discount > 100) {
        setFieldErrors({
          max_auto_discount_percent: [
            "The maximum automatic discount must be between 0 and 100.",
          ],
        });
        return;
      }

      const cadenceErrors: Record<string, string[]> = {};
      const cadenceValues: Record<string, number> = {};
      const cadenceBounds: Record<
        (typeof CADENCE_FIELDS)[number],
        [number, number]
      > = {
        facebook_max_posts_per_day: [0, 10],
        facebook_max_posts_per_week: [0, 40],
        instagram_max_posts_per_day: [0, 10],
        instagram_max_posts_per_week: [0, 40],
        min_hours_between_posts: [1, 48],
      };

      for (const field of CADENCE_FIELDS) {
        const raw = form[field].trim();
        const value = Number(raw);
        const [min, max] = cadenceBounds[field];
        if (raw === "" || Number.isNaN(value) || !Number.isInteger(value)) {
          cadenceErrors[field] = ["Enter a whole number."];
          continue;
        }
        if (value < min || value > max) {
          cadenceErrors[field] = [`Must be between ${min} and ${max}.`];
          continue;
        }
        cadenceValues[field] = value;
      }

      if (Object.keys(cadenceErrors).length > 0) {
        setFieldErrors(cadenceErrors);
        return;
      }

      const policy = await authenticatedApiRequest<BusinessPolicy>(
        `/business-brain/${businessId}/policy/`,
        accessToken,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...form,
            max_auto_discount_percent: discount,
            ...cadenceValues,
          }),
        },
      );

      setForm(formFromPolicy(policy));

      if (setup.isSetup) {
        router.push(setup.nextPath || "/workspace");
        return;
      }

      setSuccess("Your policies have been saved.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);

        if (err.details) {
          const fields = [
            "allow_content_creation",
            "allow_auto_publish",
            "allow_comment_replies",
            "allow_dm_replies",
            "allow_lead_creation",
            "allow_product_management",
            "allow_order_management",
            "require_discount_approval",
            "max_auto_discount_percent",
            "require_refund_approval",
            "require_payment_approval",
            ...CADENCE_FIELDS,
          ];

          const errors: Record<string, string[]> = {};

          for (const field of fields) {
            const messages = getFieldErrors(err.details, field);

            if (messages.length > 0) {
              errors[field] = messages;
            }
          }

          setFieldErrors(errors);
        }
      } else {
        setError("Unable to save your policies.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
              <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 h-9 w-72 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded bg-gray-100" />

          <div className="mt-10 space-y-6">
            <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
          </div>
        </div>
          );
  }

  if (!user) {
    return null;
  }

  return (
          <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#17211D]">
            Rules
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            What Kova may do automatically, and posting limits.
          </p>
        </div>

        <SetupGuide
          section="policy"
          isSetup={setup.isSetup}
          autoState={setup.autoState}
          drafting={setup.drafting}
          draftError={setup.draftError}
          onDraft={() =>
            setup.draft((fields) =>
              setForm((current) => {
                const next = {
                  ...current,
                  ...fields,
                  max_auto_discount_percent:
                    fields.max_auto_discount_percent == null
                      ? current.max_auto_discount_percent
                      : String(fields.max_auto_discount_percent),
                } as PolicyForm;
                for (const field of CADENCE_FIELDS) {
                  if (fields[field] != null) {
                    next[field] = String(fields[field]);
                  }
                }
                return next;
              }),
            )
          }
        />

        {error && (
          <div className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-8 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <PolicySection title="Content">
            <PolicyToggle
              label="Create content"
              checked={form.allow_content_creation}
              onChange={(value) =>
                updateToggle("allow_content_creation", value)
              }
            />

            <PolicyToggle
              label="Publish without approval"
              checked={form.allow_auto_publish}
              onChange={(value) =>
                updateToggle("allow_auto_publish", value)
              }
            />
          </PolicySection>

          <PolicySection
            title="Posting cadence"
            description="Defaults: Facebook 1–2/day, Instagram 3–5/week."
          >
            <div className="grid gap-6 py-5 sm:grid-cols-2">
              <CadenceNumber
                id="facebook-max-day"
                label="Facebook max per day"
                hint="Usually 1–2"
                value={form.facebook_max_posts_per_day}
                min={0}
                max={10}
                errors={fieldErrors.facebook_max_posts_per_day}
                onChange={(value) =>
                  updateCadence("facebook_max_posts_per_day", value)
                }
              />
              <CadenceNumber
                id="facebook-max-week"
                label="Facebook max per week"
                hint="Usually 7–14"
                value={form.facebook_max_posts_per_week}
                min={0}
                max={40}
                errors={fieldErrors.facebook_max_posts_per_week}
                onChange={(value) =>
                  updateCadence("facebook_max_posts_per_week", value)
                }
              />
              <CadenceNumber
                id="instagram-max-day"
                label="Instagram max per day"
                hint="Usually 1 feed post"
                value={form.instagram_max_posts_per_day}
                min={0}
                max={10}
                errors={fieldErrors.instagram_max_posts_per_day}
                onChange={(value) =>
                  updateCadence("instagram_max_posts_per_day", value)
                }
              />
              <CadenceNumber
                id="instagram-max-week"
                label="Instagram max per week"
                hint="Usually 3–5"
                value={form.instagram_max_posts_per_week}
                min={0}
                max={40}
                errors={fieldErrors.instagram_max_posts_per_week}
                onChange={(value) =>
                  updateCadence("instagram_max_posts_per_week", value)
                }
              />
              <CadenceNumber
                id="min-hours-between"
                label="Minimum hours between posts"
                hint="Same channel; usually 3–6h"
                value={form.min_hours_between_posts}
                min={1}
                max={48}
                errors={fieldErrors.min_hours_between_posts}
                onChange={(value) =>
                  updateCadence("min_hours_between_posts", value)
                }
              />
            </div>
          </PolicySection>

          <PolicySection title="Inbox">
            <PolicyToggle
              label="Reply to comments"
              checked={form.allow_comment_replies}
              onChange={(value) =>
                updateToggle("allow_comment_replies", value)
              }
            />

            <PolicyToggle
              label="Reply to DMs"
              checked={form.allow_dm_replies}
              onChange={(value) =>
                updateToggle("allow_dm_replies", value)
              }
            />

            <PolicyToggle
              label="Create leads"
              checked={form.allow_lead_creation}
              onChange={(value) =>
                updateToggle("allow_lead_creation", value)
              }
            />
          </PolicySection>

          <PolicySection title="Shop">
            <PolicyToggle
              label="Manage products"
              checked={form.allow_product_management}
              onChange={(value) =>
                updateToggle("allow_product_management", value)
              }
            />

            <PolicyToggle
              label="Manage orders"
              checked={form.allow_order_management}
              onChange={(value) =>
                updateToggle("allow_order_management", value)
              }
            />
          </PolicySection>

          <PolicySection title="Approvals">
            <PolicyToggle
              label="Discounts need approval"
              checked={form.require_discount_approval}
              onChange={(value) =>
                updateToggle("require_discount_approval", value)
              }
            />

            <div className="py-4">
              <label
                htmlFor="max-auto-discount"
                className="block text-sm font-medium text-[#17211D]"
              >
                Max auto discount
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="max-auto-discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.max_auto_discount_percent}
                  onChange={(event) =>
                    updateDiscount(event.target.value)
                  }
                  className="w-28 rounded-lg border border-[#E5E7E5] bg-white px-3 py-2 text-sm text-[#17211D] outline-none transition focus:border-[#176B4D] focus:ring-2 focus:ring-[#176B4D]/10"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              {fieldErrors.max_auto_discount_percent?.map(
                (message) => (
                  <p
                    key={message}
                    className="mt-2 text-sm text-red-600"
                  >
                    {message}
                  </p>
                ),
              )}
            </div>

            <PolicyToggle
              label="Refunds need approval"
              checked={form.require_refund_approval}
              onChange={(value) =>
                updateToggle("require_refund_approval", value)
              }
            />

            <PolicyToggle
              label="Payments need approval"
              checked={form.require_payment_approval}
              onChange={(value) =>
                updateToggle("require_payment_approval", value)
              }
            />
          </PolicySection>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-[#176B4D] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#12563D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving…" : setup.isSetup ? "Continue" : "Save"}
            </button>
          </div>
        </form>
      </main>
      );
}