"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { StoreShareLink } from "@/components/commerce/store-share-link";
import { WORKSPACE_PAGE } from "@/components/ui/page-header";

import {
  useAuth,
} from "@/lib/auth-context";

import {
  ApiError,
} from "@/lib/api";

import {
  getBusiness,
  getCommercePage,
  publishCommercePage,
  saveCommercePage,
  type Business,
  type CommercePage,
} from "@/lib/commerce";


/**
 * Storefront management page.
 *
 * The storefront is the public commerce presence Kova uses
 * around the business and its products.
 */
export default function StorefrontPage() {
  const router = useRouter();

  const {
    accessToken,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();

  const [business, setBusiness] =
    useState<Business | null>(null);

  const [page, setPage] =
    useState<CommercePage | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [publishing, setPublishing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [form, setForm] = useState({
    title: "",
    tagline: "",
    description: "",
    whatsapp: "",
    email: "",
    phone: "",
    location: "",
  });


  /**
   * Redirect only after authentication restoration is complete.
   */
  useEffect(() => {
    if (
      !authLoading &&
      !isAuthenticated
    ) {
      router.replace("/login");
    }
  }, [
    authLoading,
    isAuthenticated,
    router,
  ]);


  /**
   * Load the business and storefront after authentication.
   */
  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      !accessToken
    ) {
      return;
    }

    let cancelled = false;

    async function loadStorefront(): Promise<void> {
      setLoading(true);
      setError("");

      try {
        const currentBusiness =
          await getBusiness(
            accessToken!,
          );

        if (cancelled) {
          return;
        }

        setBusiness(
          currentBusiness,
        );

        const commercePage =
          await getCommercePage(
            currentBusiness.id,
            accessToken!,
          );

        if (cancelled) {
          return;
        }

        setPage(
          commercePage,
        );

        setForm({
          title:
            commercePage.title || "",
          tagline:
            commercePage.tagline || "",
          description:
            commercePage.description || "",
          whatsapp:
            commercePage.whatsapp || "",
          email:
            commercePage.email || "",
          phone:
            commercePage.phone || "",
          location:
            commercePage.location || "",
        });

      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Kova storefront loading failed:",
          err,
        );

        if (err instanceof ApiError) {
          setError(err.message);
        } else if (
          err instanceof Error
        ) {
          setError(err.message);
        } else {
          setError(
            "We couldn't load your storefront.",
          );
        }

      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStorefront();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    isAuthenticated,
    accessToken,
  ]);


  /**
   * Update one storefront field without replacing the rest
   * of the form state.
   */
  function updateField(
    field: keyof typeof form,
    value: string,
  ): void {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );

    setSuccess("");
    setError("");
  }


  /**
   * Save storefront information.
   */
  async function handleSave(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (
      !business ||
      !accessToken
    ) {
      return;
    }

    if (!form.title.trim()) {
      setError(
        "Please provide a storefront title.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updatedPage =
        await saveCommercePage(
          business.id,
          accessToken,
          {
            title: form.title.trim(),
            tagline:
              form.tagline.trim(),
            description:
              form.description.trim(),
            whatsapp:
              form.whatsapp.trim(),
            email:
              form.email.trim(),
            phone:
              form.phone.trim(),
            location:
              form.location.trim(),
          },
        );

      setPage(
        updatedPage,
      );

      setSuccess(
        "Your storefront has been saved.",
      );

    } catch (err) {
      console.error(
        "Kova storefront save failed:",
        err,
      );

      if (err instanceof ApiError) {
        setError(
          err.message,
        );
      } else if (
        err instanceof Error
      ) {
        setError(
          err.message,
        );
      } else {
        setError(
          "We couldn't save your storefront.",
        );
      }

    } finally {
      setSaving(false);
    }
  }


  /**
   * Publish or unpublish the storefront.
   */
  async function handlePublish(): Promise<void> {
    if (
      !business ||
      !accessToken ||
      !page
    ) {
      return;
    }

    if (!form.title.trim()) {
      setError(
        "Save a storefront title before publishing.",
      );
      return;
    }

    setPublishing(true);
    setError("");
    setSuccess("");

    try {
      /**
       * Save the current form first so publishing never exposes
       * stale storefront information.
       */
      const savedPage =
        await saveCommercePage(
          business.id,
          accessToken,
          {
            title: form.title.trim(),
            tagline:
              form.tagline.trim(),
            description:
              form.description.trim(),
            whatsapp:
              form.whatsapp.trim(),
            email:
              form.email.trim(),
            phone:
              form.phone.trim(),
            location:
              form.location.trim(),
          },
        );

      const publishedPage =
        await publishCommercePage(
          business.id,
          accessToken,
          !page.is_published,
        );

      setPage(
        publishedPage,
      );

      setForm({
        title:
          savedPage.title || "",
        tagline:
          savedPage.tagline || "",
        description:
          savedPage.description || "",
        whatsapp:
          savedPage.whatsapp || "",
        email:
          savedPage.email || "",
        phone:
          savedPage.phone || "",
        location:
          savedPage.location || "",
      });

      setSuccess(
        publishedPage.is_published
          ? "Your storefront is now live."
          : "Your storefront has been unpublished.",
      );

    } catch (err) {
      console.error(
        "Kova storefront publishing failed:",
        err,
      );

      if (err instanceof ApiError) {
        setError(
          err.message,
        );
      } else if (
        err instanceof Error
      ) {
        setError(
          err.message,
        );
      } else {
        setError(
          "We couldn't update the storefront status.",
        );
      }

    } finally {
      setPublishing(false);
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
            Loading your workspace...
          </p>
        </div>
      </main>
    );
  }


  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-kova-background">
        <p className="text-sm text-gray-500">
          Redirecting to sign in...
        </p>
      </main>
    );
  }


  if (loading) {
    return (
      <div className={WORKSPACE_PAGE}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div
              aria-hidden="true"
              className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-kova-green border-t-transparent"
            />

            <p className="mt-4 text-sm text-gray-500">
              Loading your storefront...
            </p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className={WORKSPACE_PAGE}>
      <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-5xl">

          {/* Navigation */}
          <button
            type="button"
            onClick={() =>
              router.push(
                "/workspace/commerce",
              )
            }
            className="text-sm font-medium text-kova-green hover:underline"
          >
            ← Back to Commerce
          </button>


          {/* Header */}
          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">
              Commerce
            </p>

            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
                  Your storefront
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
                  This is the commerce presence Kova can use to
                  turn your products and social activity into a
                  place where customers can discover and buy.
                </p>
              </div>


              {page && (
                <div
                  className={
                    page.is_published
                      ? "border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700"
                      : "border border-kova-border bg-white px-4 py-2 text-sm font-medium text-gray-600"
                  }
                >
                  {page.is_published
                    ? "Published"
                    : "Draft"}
                </div>
              )}

            </div>
          </div>


          {/* Error */}
          {error && (
            <div className="mt-8 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          )}


          {/* Success */}
          {success && (
            <div className="mt-8 border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
              {success}
            </div>
          )}


          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">

            {/* Form */}
            <form
              onSubmit={handleSave}
              className="border border-kova-border bg-white"
            >
              <div className="border-b border-kova-border px-6 py-5">
                <h2 className="font-semibold text-kova-dark">
                  Storefront information
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  This information becomes part of your public
                  commerce presence.
                </p>
              </div>


              <div className="space-y-6 p-6">

                <div>
                  <label className="block text-sm font-medium text-kova-dark">
                    Storefront title
                  </label>

                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      updateField(
                        "title",
                        event.target.value,
                      )
                    }
                    placeholder={
                      business?.name ||
                      "Your business name"
                    }
                    className="mt-2 w-full border border-kova-border px-3 py-3 text-sm outline-none focus:border-kova-green"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    The main name customers will see.
                  </p>
                </div>


                <div>
                  <label className="block text-sm font-medium text-kova-dark">
                    Tagline
                  </label>

                  <input
                    type="text"
                    value={form.tagline}
                    onChange={(event) =>
                      updateField(
                        "tagline",
                        event.target.value,
                      )
                    }
                    placeholder="A short statement about what you sell"
                    className="mt-2 w-full border border-kova-border px-3 py-3 text-sm outline-none focus:border-kova-green"
                  />
                </div>


                <div>
                  <label className="block text-sm font-medium text-kova-dark">
                    Description
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField(
                        "description",
                        event.target.value,
                      )
                    }
                    rows={6}
                    placeholder="Tell customers what your business offers."
                    className="mt-2 w-full resize-y border border-kova-border px-3 py-3 text-sm leading-6 outline-none focus:border-kova-green"
                  />
                </div>


                <div className="border-t border-kova-border pt-6">
                  <p className="font-semibold text-kova-dark">
                    Customer contact
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Ways customers can reach the business.
                  </p>
                </div>


                <div className="grid gap-5 sm:grid-cols-2">

                  <div>
                    <label className="block text-sm font-medium text-kova-dark">
                      WhatsApp
                    </label>

                    <input
                      type="text"
                      value={form.whatsapp}
                      onChange={(event) =>
                        updateField(
                          "whatsapp",
                          event.target.value,
                        )
                      }
                      placeholder="+254..."
                      className="mt-2 w-full border border-kova-border px-3 py-3 text-sm outline-none focus:border-kova-green"
                    />
                  </div>


                  <div>
                    <label className="block text-sm font-medium text-kova-dark">
                      Phone
                    </label>

                    <input
                      type="text"
                      value={form.phone}
                      onChange={(event) =>
                        updateField(
                          "phone",
                          event.target.value,
                        )
                      }
                      placeholder="+254..."
                      className="mt-2 w-full border border-kova-border px-3 py-3 text-sm outline-none focus:border-kova-green"
                    />
                  </div>


                  <div>
                    <label className="block text-sm font-medium text-kova-dark">
                      Email
                    </label>

                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        updateField(
                          "email",
                          event.target.value,
                        )
                      }
                      placeholder="business@example.com"
                      className="mt-2 w-full border border-kova-border px-3 py-3 text-sm outline-none focus:border-kova-green"
                    />
                  </div>


                  <div>
                    <label className="block text-sm font-medium text-kova-dark">
                      Location
                    </label>

                    <input
                      type="text"
                      value={form.location}
                      onChange={(event) =>
                        updateField(
                          "location",
                          event.target.value,
                        )
                      }
                      placeholder="Nairobi, Kenya"
                      className="mt-2 w-full border border-kova-border px-3 py-3 text-sm outline-none focus:border-kova-green"
                    />
                  </div>

                </div>


                <div className="flex justify-end border-t border-kova-border pt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="border border-kova-green bg-kova-green px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : "Save storefront"}
                  </button>
                </div>

              </div>
            </form>


            {/* Storefront status */}
            <aside className="space-y-5">

              <div className="border border-kova-border bg-white p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-kova-green">
                  Storefront status
                </p>

                <h2 className="mt-3 text-xl font-semibold text-kova-dark">
                  {page?.is_published
                    ? "Your storefront is live"
                    : "Your storefront is a draft"}
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  {page?.is_published
                    ? "Customers can access the published commerce presence."
                    : "Save your information and publish when you are ready for customers to see it."}
                </p>


                {page?.slug && (
                  <StoreShareLink
                    slug={page.slug}
                    published={!!page.is_published}
                  />
                )}

                <button
                  type="button"
                  onClick={
                    handlePublish
                  }
                  disabled={publishing}
                  className={
                    page?.is_published
                      ? "mt-6 w-full border border-kova-border bg-white px-4 py-3 text-sm font-semibold text-kova-dark hover:bg-kova-background disabled:opacity-60"
                      : "mt-6 w-full border border-kova-green bg-kova-green px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  }
                >
                  {publishing
                    ? "Updating..."
                    : page?.is_published
                      ? "Unpublish storefront"
                      : "Publish storefront"}
                </button>
              </div>


              <div className="border border-kova-border bg-kova-background p-6">
                <p className="font-semibold text-kova-dark">
                  What happens next?
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Your products will become part of this commerce
                  presence. Kova can then use them when creating
                  content, responding to customers, and supporting
                  future social selling workflows.
                </p>
              </div>

            </aside>

          </div>

        </div>
      </div>
    </div>
  );
}