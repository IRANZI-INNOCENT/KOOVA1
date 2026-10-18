"use client";

import {
  useEffect,
  useRef,
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
  addCommercePageBanner,
  deleteCommercePageBanner,
  getBusiness,
  getCommercePage,
  publishCommercePage,
  reorderCommercePageBanners,
  saveCommercePage,
  updateCommercePageBanner,
  uploadCommercePageImage,
  type Business,
  type CommercePage,
} from "@/lib/commerce";
import { mediaSrc } from "@/lib/media";
import {
  FONT_PRESETS,
  KCOVA_STORE_COLORS,
  LAYOUT_PRESETS,
  storeThemeStyle,
} from "@/lib/store-theme";


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
    slug: "",
    primary_color: KCOVA_STORE_COLORS.primary as string,
    secondary_color: KCOVA_STORE_COLORS.secondary as string,
    accent_color: KCOVA_STORE_COLORS.accent as string,
    layout_preset: "compact" as CommercePage["layout_preset"],
    font_preset: "classic" as CommercePage["font_preset"],
    show_hero: true,
    show_about: true,
    show_featured: false,
  });
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null);
  const [bannerBusyId, setBannerBusyId] = useState<number | null>(null);
  const [bannerError, setBannerError] = useState("");
  const bannerInputRef = useRef<HTMLInputElement>(null);


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

        setPage(commercePage);
        setForm(formFromPage(commercePage));

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


  function formFromPage(commercePage: CommercePage) {
    return {
      title: commercePage.title || "",
      tagline: commercePage.tagline || "",
      description: commercePage.description || "",
      whatsapp: commercePage.whatsapp || "",
      email: commercePage.email || "",
      phone: commercePage.phone || "",
      location: commercePage.location || "",
      slug: commercePage.slug || "",
      primary_color:
        commercePage.primary_color || KCOVA_STORE_COLORS.primary,
      secondary_color:
        commercePage.secondary_color || KCOVA_STORE_COLORS.secondary,
      accent_color:
        commercePage.accent_color || KCOVA_STORE_COLORS.accent,
      layout_preset: (commercePage.layout_preset ||
        "compact") as CommercePage["layout_preset"],
      font_preset: (commercePage.font_preset ||
        "classic") as CommercePage["font_preset"],
      show_hero: commercePage.show_hero !== false,
      show_about: commercePage.show_about !== false,
      show_featured: !!commercePage.show_featured,
    };
  }

  function brandingPayload() {
    return {
      title: form.title.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      whatsapp: form.whatsapp.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      slug: form.slug.trim(),
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      accent_color: form.accent_color,
      layout_preset: form.layout_preset,
      font_preset: form.font_preset,
      show_hero: form.show_hero,
      show_about: form.show_about,
      show_featured: form.show_featured,
    };
  }

  /**
   * Update one storefront field without replacing the rest
   * of the form state.
   */
  function updateField<K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K],
  ): void {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setSuccess("");
    setError("");
  }

  async function handleLogoUpload(file: File | null): Promise<void> {
    if (!business || !accessToken || !file) return;
    setUploading("logo");
    setError("");
    try {
      const updated = await uploadCommercePageImage(
        business.id,
        accessToken,
        "logo",
        file,
      );
      setPage(updated);
      setSuccess("Logo uploaded.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "We couldn't upload that image.",
      );
    } finally {
      setUploading(null);
    }
  }

  async function handleBannerUpload(file: File | null): Promise<void> {
    if (!business || !accessToken || !file) return;
    const limit = page?.banner_limit ?? 5;
    const current = page?.banners?.length ?? 0;
    if (current >= limit) {
      const message = `You can add up to ${limit} banner slides.`;
      setBannerError(message);
      setError(message);
      return;
    }
    setUploading("banner");
    setBannerError("");
    setError("");
    setSuccess("");
    try {
      const updated = await addCommercePageBanner(
        business.id,
        accessToken,
        file,
      );
      setPage(updated);
      const count = updated.banners?.length ?? current + 1;
      setSuccess(
        `Banner slide ${count} added. It will rotate on your store.`,
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "We couldn't upload that banner.";
      setBannerError(message);
      setError(message);
    } finally {
      setUploading(null);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = "";
      }
    }
  }

  async function moveBanner(bannerId: number, direction: -1 | 1): Promise<void> {
    if (!business || !accessToken || !page?.banners?.length) return;
    const ids = page.banners.map((b) => b.id);
    const index = ids.indexOf(bannerId);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= ids.length) return;
    const reordered = [...ids];
    const [item] = reordered.splice(index, 1);
    reordered.splice(next, 0, item);
    setBannerBusyId(bannerId);
    setError("");
    try {
      setPage(
        await reorderCommercePageBanners(
          business.id,
          accessToken,
          reordered,
        ),
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "We couldn't reorder banners.",
      );
    } finally {
      setBannerBusyId(null);
    }
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
      const updatedPage = await saveCommercePage(
        business.id,
        accessToken,
        brandingPayload(),
      );

      setPage(updatedPage);
      setForm(formFromPage(updatedPage));

      setSuccess("Your storefront has been saved.");

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
       * stale storefront information (including brand look).
       */
      await saveCommercePage(
        business.id,
        accessToken,
        brandingPayload(),
      );

      const publishedPage = await publishCommercePage(
        business.id,
        accessToken,
        !page.is_published,
      );

      setPage(publishedPage);
      setForm(formFromPage(publishedPage));

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
                    Store link
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Your public URL: /store/{form.slug || "your-shop"}
                  </p>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(event) =>
                      updateField("slug", event.target.value.toLowerCase())
                    }
                    placeholder="your-shop"
                    className="mt-3 w-full border border-kova-border px-3 py-3 text-sm outline-none focus:border-kova-green"
                  />
                </div>

                <div className="border-t border-kova-border pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-kova-dark">
                        Brand look
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Three brand colors, logo, and promo banners so your shop
                        feels like yours — not a default template.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((current) => ({
                          ...current,
                          primary_color: KCOVA_STORE_COLORS.primary,
                          secondary_color: KCOVA_STORE_COLORS.secondary,
                          accent_color: KCOVA_STORE_COLORS.accent,
                        }));
                        setSuccess("");
                        setError("");
                      }}
                      className="shrink-0 text-xs font-semibold text-kova-green underline-offset-2 hover:underline"
                    >
                      Reset to KCOVA colors
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-kova-dark">
                        Primary
                      </label>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        Header & footer
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="color"
                          value={form.primary_color}
                          onChange={(e) =>
                            updateField("primary_color", e.target.value)
                          }
                          className="h-10 w-12 shrink-0 cursor-pointer border border-kova-border bg-white"
                        />
                        <input
                          type="text"
                          value={form.primary_color}
                          onChange={(e) =>
                            updateField("primary_color", e.target.value)
                          }
                          className="w-full border border-kova-border px-2 py-2 text-xs uppercase outline-none focus:border-kova-green"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-kova-dark">
                        Secondary
                      </label>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        Titles & badges
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="color"
                          value={form.secondary_color}
                          onChange={(e) =>
                            updateField("secondary_color", e.target.value)
                          }
                          className="h-10 w-12 shrink-0 cursor-pointer border border-kova-border bg-white"
                        />
                        <input
                          type="text"
                          value={form.secondary_color}
                          onChange={(e) =>
                            updateField("secondary_color", e.target.value)
                          }
                          className="w-full border border-kova-border px-2 py-2 text-xs uppercase outline-none focus:border-kova-green"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-kova-dark">
                        Accent
                      </label>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        Prices & CTAs
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="color"
                          value={form.accent_color}
                          onChange={(e) =>
                            updateField("accent_color", e.target.value)
                          }
                          className="h-10 w-12 shrink-0 cursor-pointer border border-kova-border bg-white"
                        />
                        <input
                          type="text"
                          value={form.accent_color}
                          onChange={(e) =>
                            updateField("accent_color", e.target.value)
                          }
                          className="w-full border border-kova-border px-2 py-2 text-xs uppercase outline-none focus:border-kova-green"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 max-w-sm">
                    <div>
                      <label className="block text-sm font-medium text-kova-dark">
                        Logo
                      </label>
                      {page?.logo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaSrc(page.logo_url)}
                          alt=""
                          className="mt-2 h-16 w-16 rounded-md object-cover border border-kova-border"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="mt-2 block w-full text-xs text-gray-500"
                        disabled={uploading === "logo"}
                        onChange={(e) =>
                          handleLogoUpload(e.target.files?.[0] ?? null)
                        }
                      />
                      {page?.logo_url && (
                        <button
                          type="button"
                          className="mt-2 text-xs font-semibold text-red-600"
                          onClick={async () => {
                            if (!business || !accessToken) return;
                            const updated = await saveCommercePage(
                              business.id,
                              accessToken,
                              { clear_logo: true },
                            );
                            setPage(updated);
                          }}
                        >
                          Remove logo
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-kova-dark">
                      Promo banners
                    </label>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Up to {page?.banner_limit ?? 5} slides for flash sales,
                      new arrivals, or discounts. Use the label field for the
                      words shown on the slide (e.g. “Weekend 20% off”). Images
                      are compressed automatically for fast loading.
                    </p>

                    {(page?.banners?.length ?? 0) > 0 && (
                      <ul className="mt-3 space-y-3">
                        {page!.banners!.map((banner, index) => (
                          <li
                            key={banner.id}
                            className="flex flex-col gap-2 rounded-md border border-kova-border bg-kova-background/60 p-3 sm:flex-row sm:items-center"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={mediaSrc(banner.url)}
                              alt=""
                              className="h-16 w-full max-w-[140px] rounded object-cover border border-kova-border"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-kova-dark">
                                Slide {index + 1}
                              </p>
                              <input
                                type="text"
                                defaultValue={banner.alt_text || ""}
                                placeholder="e.g. Weekend flash sale"
                                className="mt-1 w-full border border-kova-border bg-white px-2 py-1.5 text-xs outline-none focus:border-kova-green"
                                onBlur={async (e) => {
                                  if (!business || !accessToken) return;
                                  const next = e.target.value.trim();
                                  if (next === (banner.alt_text || "")) return;
                                  setBannerBusyId(banner.id);
                                  try {
                                    setPage(
                                      await updateCommercePageBanner(
                                        business.id,
                                        accessToken,
                                        banner.id,
                                        next,
                                      ),
                                    );
                                  } catch (err) {
                                    setError(
                                      err instanceof ApiError
                                        ? err.message
                                        : "Could not update label.",
                                    );
                                  } finally {
                                    setBannerBusyId(null);
                                  }
                                }}
                              />
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={
                                    index === 0 || bannerBusyId === banner.id
                                  }
                                  className="text-xs font-semibold text-kova-dark disabled:opacity-40"
                                  onClick={() => moveBanner(banner.id, -1)}
                                >
                                  Move up
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    index ===
                                      (page?.banners?.length ?? 0) - 1 ||
                                    bannerBusyId === banner.id
                                  }
                                  className="text-xs font-semibold text-kova-dark disabled:opacity-40"
                                  onClick={() => moveBanner(banner.id, 1)}
                                >
                                  Move down
                                </button>
                                <button
                                  type="button"
                                  disabled={bannerBusyId === banner.id}
                                  className="text-xs font-semibold text-red-600 disabled:opacity-40"
                                  onClick={async () => {
                                    if (!business || !accessToken) return;
                                    setBannerBusyId(banner.id);
                                    try {
                                      setPage(
                                        await deleteCommercePageBanner(
                                          business.id,
                                          accessToken,
                                          banner.id,
                                        ),
                                      );
                                      setSuccess("Banner removed.");
                                    } catch (err) {
                                      setError(
                                        err instanceof ApiError
                                          ? err.message
                                          : "Could not remove banner.",
                                      );
                                    } finally {
                                      setBannerBusyId(null);
                                    }
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {(page?.banners?.length ?? 0) <
                      (page?.banner_limit ?? 5) && (
                      <div className="mt-3">
                        <input
                          ref={bannerInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="sr-only"
                          disabled={uploading === "banner"}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            void handleBannerUpload(file);
                          }}
                        />
                        <button
                          type="button"
                          disabled={uploading === "banner"}
                          onClick={() => bannerInputRef.current?.click()}
                          className="inline-flex h-10 items-center rounded-md border border-kova-green bg-kova-green px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {uploading === "banner"
                            ? "Uploading…"
                            : (page?.banners?.length ?? 0) > 0
                              ? "Add another slide"
                              : "Add banner slide"}
                        </button>
                        <p className="mt-2 text-[11px] text-gray-500">
                          JPG, PNG, or WebP.{" "}
                          {(page?.banners?.length ?? 0) + 1} of{" "}
                          {page?.banner_limit ?? 5} slots.
                        </p>
                      </div>
                    )}
                    {bannerError && (
                      <p className="mt-2 text-xs font-medium text-red-600">
                        {bannerError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-kova-border pt-6">
                  <p className="font-semibold text-kova-dark">Layout</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Pick a preset — not a blank canvas. Your catalog stays easy
                    to shop.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {LAYOUT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          updateField("layout_preset", preset.id)
                        }
                        className={`rounded-md border px-3 py-3 text-left text-sm transition ${
                          form.layout_preset === preset.id
                            ? "border-kova-green bg-kova-green/5"
                            : "border-kova-border bg-white hover:border-kova-green/40"
                        }`}
                      >
                        <span className="font-semibold text-kova-dark">
                          {preset.label}
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          {preset.blurb}
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="mt-5 text-sm font-medium text-kova-dark">
                    Type style
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {FONT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => updateField("font_preset", preset.id)}
                        className={`rounded-md border px-3 py-2 text-xs font-semibold ${
                          form.font_preset === preset.id
                            ? "border-kova-green bg-kova-green text-white"
                            : "border-kova-border text-kova-dark"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 space-y-2 text-sm">
                    <label className="flex items-center gap-2 text-kova-dark">
                      <input
                        type="checkbox"
                        checked={form.show_hero}
                        onChange={(e) =>
                          updateField("show_hero", e.target.checked)
                        }
                      />
                      Show banner / hero block
                    </label>
                    <label className="flex items-center gap-2 text-kova-dark">
                      <input
                        type="checkbox"
                        checked={form.show_featured}
                        onChange={(e) =>
                          updateField("show_featured", e.target.checked)
                        }
                      />
                      Show featured products strip
                    </label>
                    <label className="flex items-center gap-2 text-kova-dark">
                      <input
                        type="checkbox"
                        checked={form.show_about}
                        onChange={(e) =>
                          updateField("show_about", e.target.checked)
                        }
                      />
                      Show about text in the footer
                    </label>
                  </div>
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


              <div className="border border-kova-border bg-white p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-kova-green">
                  Live preview
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Primary chrome, secondary titles, accent CTAs — balanced
                  for customers.
                </p>
                <div
                  className="mt-4 overflow-hidden rounded-md border"
                  style={{
                    ...storeThemeStyle({
                      primary_color: form.primary_color,
                      secondary_color: form.secondary_color,
                      accent_color: form.accent_color,
                      font_preset: form.font_preset,
                    }),
                    borderColor: "var(--store-border)",
                  }}
                >
                  <div
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                    style={{
                      backgroundColor: "var(--store-primary)",
                      color: "var(--store-on-primary)",
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {page?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaSrc(page.logo_url)}
                          alt=""
                          className="h-7 w-7 rounded object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded bg-white/15 text-[10px] font-bold">
                          {(form.title || "S").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <span className="truncate text-sm font-bold">
                        {form.title.trim() || "Your shop"}
                      </span>
                    </div>
                    <span
                      className="shrink-0 rounded px-2 py-1 text-[10px] font-bold"
                      style={{
                        backgroundColor: "var(--store-accent)",
                        color: "var(--store-on-accent)",
                      }}
                    >
                      WhatsApp
                    </span>
                  </div>
                  <div
                    className="h-0.5 w-full"
                    style={{ backgroundColor: "var(--store-secondary)" }}
                    aria-hidden
                  />
                  <div className="px-3 py-3">
                    <p
                      className="text-xs font-semibold"
                      style={{ color: "var(--store-secondary)" }}
                    >
                      Sample product
                    </p>
                    <p
                      className="mt-1 text-sm font-bold"
                      style={{ color: "var(--store-accent)" }}
                    >
                      KES 1,200
                    </p>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Layout:{" "}
                      {LAYOUT_PRESETS.find((p) => p.id === form.layout_preset)
                        ?.label || form.layout_preset}
                      {" · "}
                      {FONT_PRESETS.find((p) => p.id === form.font_preset)
                        ?.label || form.font_preset}
                    </p>
                  </div>
                </div>
                {page?.slug && page.is_published && (
                  <a
                    href={`/store/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex text-sm font-semibold text-kova-green hover:underline"
                  >
                    Open live store →
                  </a>
                )}
              </div>

              <div className="border border-kova-border bg-kova-background p-6">
                <p className="font-semibold text-kova-dark">
                  What happens next?
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Save and publish when ready. Customers see your colors,
                  logo, and layout on /store/{form.slug || "your-shop"}.
                  Custom domains come later — “Powered by KCOVA” stays for now.
                </p>
              </div>

            </aside>

          </div>

        </div>
      </div>
    </div>
  );
}