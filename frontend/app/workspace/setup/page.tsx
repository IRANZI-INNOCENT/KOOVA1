"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  AppShell,
} from "@/components/workspace/app-shell";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  ApiError,
  authenticatedApiRequest,
} from "@/lib/api";

import {
  type BrainProgress,
} from "@/lib/setup-flow";

import {
  createBusiness,
  getCurrentBusiness,
  updateBusiness,
} from "@/lib/business";

import {
  getCommercePage,
  saveCommercePage,
} from "@/lib/commerce";

import {
  useAuth,
} from "@/lib/auth-context";


interface BusinessForm {
  name: string;
  description: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
}


const initialForm: BusinessForm = {
  name: "",
  description: "",
  industry: "",
  location: "",
  email: "",
  phone: "",
};

async function nextSetupHref(
  accessToken: string,
  businessId: number,
): Promise<string> {
  try {
    const progress = await authenticatedApiRequest<BrainProgress>(
      `/business-brain/${businessId}/progress/`,
      accessToken,
    );
    if (progress.next_href) {
      return progress.next_href;
    }
  } catch {
    // Fall through to the first Business Brain step.
  }
  return "/workspace/settings/business-profile?setup=1";
}


export default function BusinessSetupPage() {
  const router = useRouter();

  const {
    isAuthenticated,
    isLoading: authLoading,
    accessToken,
  } = useAuth();

  const [form, setForm] =
    useState<BusinessForm>(
      initialForm,
    );

  const [businessId, setBusinessId] =
    useState<number | null>(null);

  const [original, setOriginal] =
    useState<BusinessForm>(initialForm);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (authLoading || !isAuthenticated || !accessToken) return;
    const token = accessToken;
    getCurrentBusiness(token)
      .then((business) => {
        if (!business) return;
        setBusinessId(business.id);
        const loaded = {
          name: business.name,
          description: business.description,
          industry: business.industry,
          location: business.location,
          email: business.email,
          phone: business.phone,
        };
        setOriginal(loaded);
        setForm(loaded);
      })
      .finally(() => setLoading(false));
  }, [accessToken, authLoading, isAuthenticated]);


  function updateField(
    field: keyof BusinessForm,
    value: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );

    setError("");
  }


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!accessToken) {
      return;
    }

    const name =
      form.name.trim();

    if (!name) {
      setError(
        "Business name is required.",
      );

      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      ...form,
      name,
    };

    try {
      if (businessId) {
        await updateBusiness(accessToken, businessId, payload);
        try {
          const page = await getCommercePage(businessId, accessToken);
          const pageUpdates: Record<string, string> = {};
          if (!page.phone || page.phone === original.phone) {
            pageUpdates.phone = payload.phone;
          }
          if (!page.whatsapp || page.whatsapp === original.phone) {
            pageUpdates.whatsapp = payload.phone;
          }
          if (!page.email || page.email === original.email) {
            pageUpdates.email = payload.email;
          }
          if (!page.location || page.location === original.location) {
            pageUpdates.location = payload.location;
          }
          if (Object.keys(pageUpdates).length) {
            await saveCommercePage(businessId, accessToken, pageUpdates);
          }
        } catch {
          // The business record is saved even if the store page is unavailable.
        }
        setOriginal(payload);
        const nextHref = await nextSetupHref(accessToken, businessId);
        router.push(nextHref);
        return;
      }

      const created = await createBusiness(accessToken, payload);
      const nextHref = await nextSetupHref(accessToken, created.id);
      router.replace(nextHref);

    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.message,
        );
      } else {
        setError(
          "We couldn't create your business. Please try again.",
        );
      }

    } finally {
      setSaving(false);
    }
  }


  if (authLoading || (isAuthenticated && loading)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-kova-background">
        <p className="text-sm text-gray-500">
          Loading your workspace...
        </p>
      </main>
    );
  }


  if (!isAuthenticated) {
    router.replace("/login");

    return (
      <main className="flex min-h-screen items-center justify-center bg-kova-background">
        <p className="text-sm text-gray-500">
          Redirecting to sign in...
        </p>
      </main>
    );
  }


  return (
    <AppShell>
      <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-4xl">

          <div className="mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">
              Business Setup
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-kova-dark">
              {businessId ? "Your business" : "Let's set up your business."}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              {businessId
                ? "Update the name, phone number, email, and location customers and Kova use."
                : "Tell Kova a little about your business. Next you will walk through profile, customers, brand, goals, policies, and a market brief. Each part is saved if you leave, and Kova can draft the later parts from what you enter here."}
            </p>
          </div>


          <form
            onSubmit={handleSubmit}
            className="border border-kova-border bg-white p-6 sm:p-10"
          >

            <div className="space-y-8">

              <Input
                label="Business name *"
                value={form.name}
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value,
                  )
                }
                placeholder="e.g. Kova Boutique"
              />


              <div>
                <label
                  htmlFor="business-description"
                  className="block text-sm font-medium text-kova-dark"
                >
                  What does your business do?
                </label>

                <textarea
                  id="business-description"
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value,
                    )
                  }
                  rows={5}
                  placeholder="Tell Kova what your business sells or provides."
                  className="mt-2 block w-full border border-kova-border bg-white px-4 py-3 text-sm text-kova-dark outline-none focus:border-kova-green focus:ring-1 focus:ring-kova-green"
                />

                <p className="mt-2 text-xs text-gray-500">
                  This becomes part of the information Kova uses
                  to understand your business.
                </p>
              </div>


              <div className="grid gap-6 sm:grid-cols-2">

                <Input
                  label="Industry"
                  value={form.industry}
                  onChange={(event) =>
                    updateField(
                      "industry",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Fashion"
                />

                <Input
                  label="Location"
                  value={form.location}
                  onChange={(event) =>
                    updateField(
                      "location",
                      event.target.value,
                    )
                  }
                  placeholder="e.g. Nairobi, Kenya"
                />

              </div>


              <div className="grid gap-6 sm:grid-cols-2">

                <Input
                  label="Business email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value,
                    )
                  }
                  placeholder="business@example.com"
                />

                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={(event) =>
                    updateField(
                      "phone",
                      event.target.value,
                    )
                  }
                  placeholder="+254..."
                />

              </div>


              {error && (
                <div
                  role="alert"
                  className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}


              <div className="flex justify-end border-t border-kova-border pt-6">

                <Button
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Continue"}
                </Button>

              </div>

            </div>

          </form>

        </div>
      </div>
    </AppShell>
  );
}