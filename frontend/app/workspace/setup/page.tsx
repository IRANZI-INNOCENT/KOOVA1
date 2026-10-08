"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

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
  useAuth,
} from "@/lib/auth-context";


/**
 * Data required to create a Kova business.
 */
interface BusinessFormData {
  name: string;
  description: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
}


/**
 * Business returned by the Kova API after creation.
 */
interface Business {
  id: number;
  name: string;
  description: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
}


export default function BusinessSetupPage() {
  const router = useRouter();

  const {
    isAuthenticated,
    isLoading: authLoading,
    accessToken,
  } = useAuth();


  const [
    formData,
    setFormData,
  ] = useState<BusinessFormData>({
    name: "",
    description: "",
    industry: "",
    location: "",
    email: "",
    phone: "",
  });


  const [
    error,
    setError,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  /**
   * Update one field in the business form.
   *
   * Keeping the update logic centralized prevents every input
   * from needing its own state management pattern.
   */
  function updateField(
    field: keyof BusinessFormData,
    value: string,
  ): void {
    setFormData(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  }


  /**
   * Create the user's first business.
   *
   * Ownership is assigned by the backend from the authenticated
   * user. The frontend therefore never sends an owner ID.
   */
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setError("");


    if (!accessToken) {
      setError(
        "Your session has expired. Please sign in again.",
      );

      return;
    }


    if (!formData.name.trim()) {
      setError(
        "Please enter your business name.",
      );

      return;
    }


    setLoading(true);


    try {
      await authenticatedApiRequest<Business>(
          "/businesses/",
          accessToken,
          {
            method: "POST",
            body: JSON.stringify({
              name: formData.name.trim(),
              description:
                formData.description.trim(),
              industry:
                formData.industry.trim(),
              location:
                formData.location.trim(),
              email:
                formData.email.trim(),
              phone:
                formData.phone.trim(),
            }),
          },
        );


      /**
       * The business now exists, so the user can enter the normal
       * workspace experience.
       */
      router.push("/workspace");

      return;

    } catch (error) {
      console.error(
        "Kova business creation failed:",
        error,
      );


      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError(
          "We couldn't create your business. Please try again.",
        );
      }

    } finally {
      setLoading(false);
    }
  }


  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-kova-background">

        <div className="text-center">

          <div
            aria-hidden="true"
            className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-kova-green border-t-transparent"
          />

          <p className="mt-4 text-sm text-gray-500">
            Loading your account...
          </p>

        </div>

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

        <div className="mx-auto max-w-3xl">

          {/* Introduction */}
          <div className="mb-10">

            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">
              Business setup
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
              Let's set up your business.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Tell Kova a little about your business so it can
              understand what you do and start working with you.
            </p>

          </div>


          {/* Setup form */}
          <div className="border border-kova-border bg-white p-6 sm:p-8">

            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >

              <Input
                id="business-name"
                name="name"
                type="text"
                label="Business name"
                value={formData.name}
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value,
                  )
                }
                placeholder="e.g. Kova Boutique"
                required
                disabled={loading}
              />


              <div>

                <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-kova-dark"
                >
                  What does your business do?
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value,
                    )
                  }
                  placeholder="Tell Kova what your business sells or provides."
                  rows={4}
                  disabled={loading}
                  className="w-full resize-none border border-kova-border bg-white px-4 py-3 text-sm text-kova-dark outline-none transition-colors placeholder:text-gray-400 focus:border-kova-green focus:ring-1 focus:ring-kova-green disabled:cursor-not-allowed disabled:bg-gray-100"
                />

                <p className="mt-2 text-xs text-gray-500">
                  This will help Kova understand your business
                  when creating content and responding to customers.
                </p>

              </div>


              <Input
                id="industry"
                name="industry"
                type="text"
                label="Industry"
                value={formData.industry}
                onChange={(event) =>
                  updateField(
                    "industry",
                    event.target.value,
                  )
                }
                placeholder="e.g. Fashion, Food, Retail, Technology"
                disabled={loading}
              />


              <Input
                id="location"
                name="location"
                type="text"
                label="Business location"
                value={formData.location}
                onChange={(event) =>
                  updateField(
                    "location",
                    event.target.value,
                  )
                }
                placeholder="e.g. Nairobi, Kenya"
                disabled={loading}
              />


              <div className="border-t border-kova-border pt-6">

                <p className="text-sm font-semibold text-kova-dark">
                  Customer contact details
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Optional. These are contact details customers
                  can use to reach your business. They are separate
                  from your Kova account information.
                </p>

              </div>


              <Input
                id="business-email"
                name="email"
                type="email"
                label="Business email"
                value={formData.email}
                onChange={(event) =>
                  updateField(
                    "email",
                    event.target.value,
                  )
                }
                placeholder="hello@yourbusiness.com"
                autoComplete="email"
                disabled={loading}
              />


              <Input
                id="business-phone"
                name="phone"
                type="tel"
                label="Business phone"
                value={formData.phone}
                onChange={(event) =>
                  updateField(
                    "phone",
                    event.target.value,
                  )
                }
                placeholder="+254 7XX XXX XXX"
                autoComplete="tel"
                disabled={loading}
              />


              {error && (
                <div
                  role="alert"
                  className="border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              )}


              <div className="flex flex-col gap-3 border-t border-kova-border pt-6 sm:flex-row sm:items-center sm:justify-between">

                <Link
                  href="/workspace"
                  className="text-sm font-medium text-gray-500 transition-colors hover:text-kova-dark"
                >
                  Cancel
                </Link>


                <Button
                  type="submit"
                  loading={loading}
                  className="sm:min-w-44"
                >
                  Create business
                </Button>

              </div>

            </form>

          </div>

        </div>

      </div>

    </AppShell>
  );
}