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
};

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
  description: string;
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
    <div className="flex items-center justify-between gap-6 py-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#17211D]">{label}</p>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
          {description}
        </p>
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
  description: string;
  children: React.ReactNode;
}

function PolicySection({
  title,
  description,
  children,
}: PolicySectionProps) {
  return (
    <section className="rounded-xl border border-[#E5E7E5] bg-white">
      <div className="border-b border-[#E5E7E5] px-6 py-5">
        <h2 className="text-base font-semibold text-[#17211D]">{title}</h2>

        <p className="mt-1 text-sm leading-6 text-gray-500">
          {description}
        </p>
      </div>

      <div className="divide-y divide-[#E5E7E5] px-6">{children}</div>
    </section>
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

      const policy = await authenticatedApiRequest<BusinessPolicy>(
        `/business-brain/${businessId}/policy/`,
        accessToken,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...form,
            max_auto_discount_percent: discount,
          }),
        },
      );

      setForm({
        allow_content_creation: policy.allow_content_creation,
        allow_auto_publish: policy.allow_auto_publish,
        allow_comment_replies: policy.allow_comment_replies,
        allow_dm_replies: policy.allow_dm_replies,
        allow_lead_creation: policy.allow_lead_creation,
        allow_product_management:
          policy.allow_product_management,
        allow_order_management: policy.allow_order_management,

        require_discount_approval:
          policy.require_discount_approval,
        max_auto_discount_percent:
          String(policy.max_auto_discount_percent),
        require_refund_approval:
          policy.require_refund_approval,
        require_payment_approval:
          policy.require_payment_approval,
      });

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
          <p className="text-sm font-medium text-[#176B4D]">
            Business Brain
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#17211D]">
            Define how Kova is allowed to operate
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            Set the operating rules Kova should follow when creating
            content, communicating with customers, and managing your
            business.
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
              setForm((current) => ({
                ...current,
                ...fields,
                max_auto_discount_percent:
                  fields.max_auto_discount_percent == null
                    ? current.max_auto_discount_percent
                    : String(fields.max_auto_discount_percent),
              })),
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
          <PolicySection
            title="Content"
            description="Control what Kova can create and publish for your business."
          >
            <PolicyToggle
              label="Create content"
              description="Allow Kova to create social media content for your business."
              checked={form.allow_content_creation}
              onChange={(value) =>
                updateToggle("allow_content_creation", value)
              }
            />

            <PolicyToggle
              label="Publish content automatically"
              description="Allow Kova to publish content without asking for approval first."
              checked={form.allow_auto_publish}
              onChange={(value) =>
                updateToggle("allow_auto_publish", value)
              }
            />
          </PolicySection>

          <PolicySection
            title="Customer communication"
            description="Control how Kova can communicate with people interacting with your business."
          >
            <PolicyToggle
              label="Reply to comments"
              description="Allow Kova to respond to comments on your social content."
              checked={form.allow_comment_replies}
              onChange={(value) =>
                updateToggle("allow_comment_replies", value)
              }
            />

            <PolicyToggle
              label="Reply to direct messages"
              description="Allow Kova to respond to customer direct messages."
              checked={form.allow_dm_replies}
              onChange={(value) =>
                updateToggle("allow_dm_replies", value)
              }
            />

            <PolicyToggle
              label="Create leads"
              description="Allow Kova to identify and create leads from customer interactions."
              checked={form.allow_lead_creation}
              onChange={(value) =>
                updateToggle("allow_lead_creation", value)
              }
            />
          </PolicySection>

          <PolicySection
            title="Commerce"
            description="Control whether Kova can make changes to your business commerce operations."
          >
            <PolicyToggle
              label="Manage products"
              description="Allow Kova to create or update product information."
              checked={form.allow_product_management}
              onChange={(value) =>
                updateToggle("allow_product_management", value)
              }
            />

            <PolicyToggle
              label="Manage orders"
              description="Allow Kova to take actions related to customer orders."
              checked={form.allow_order_management}
              onChange={(value) =>
                updateToggle("allow_order_management", value)
              }
            />
          </PolicySection>

          <PolicySection
            title="Approvals"
            description="Define actions that should always require your approval."
          >
            <PolicyToggle
              label="Discounts require approval"
              description="Require your approval before Kova applies a discount."
              checked={form.require_discount_approval}
              onChange={(value) =>
                updateToggle("require_discount_approval", value)
              }
            />

            <div className="py-5">
              <label
                htmlFor="max-auto-discount"
                className="block text-sm font-medium text-[#17211D]"
              >
                Maximum automatic discount
              </label>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                The highest discount percentage Kova may apply
                automatically when automatic discounts are allowed.
              </p>

              <div className="mt-4 flex items-center gap-3">
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
                  className="w-28 rounded-lg border border-[#E5E7E5] bg-white px-3 py-2.5 text-sm text-[#17211D] outline-none transition focus:border-[#176B4D] focus:ring-2 focus:ring-[#176B4D]/10"
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
              label="Refunds require approval"
              description="Require your approval before Kova takes refund-related actions."
              checked={form.require_refund_approval}
              onChange={(value) =>
                updateToggle("require_refund_approval", value)
              }
            />

            <PolicyToggle
              label="Payments require approval"
              description="Require your approval before Kova takes payment-related actions."
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
              {isSaving ? "Saving..." : setup.isSetup ? "Continue" : "Save policies"}
            </button>
          </div>
        </form>
      </main>
      );
}