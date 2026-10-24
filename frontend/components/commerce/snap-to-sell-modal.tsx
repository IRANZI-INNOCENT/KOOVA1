"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Product,
  SnapToSellBatchError,
  invalidateCommerceCaches,
  snapToSell,
  snapToSellBatch,
  updateProduct,
} from "@/lib/commerce";

const MAX_SNAP_PHOTOS = 10;
import { authenticatedApiRequest } from "@/lib/api";

interface SnapToSellModalProps {
  open: boolean;
  onClose: () => void;
  businessId: number;
  accessToken: string;
  onCreated?: (product: Product) => void;
}

type Step =
  | "capture"
  | "price"
  | "processing"
  | "review"
  | "batchReview"
  | "manual"
  | "live";

type SnapMode = "single" | "batch";
type OfferingKind = "product" | "service";
type BatchPriceMode = "shared" | "individual";

interface ImagePreview {
  file: File;
  url: string;
}

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Kova could not complete this operation.";
  }

  const message = error.message || "";

  // Never expose Django's HTML debug page inside the UI.
  if (
    message.includes("<!DOCTYPE") ||
    message.includes("<html") ||
    message.includes("Traceback") ||
    message.includes("TypeError at")
  ) {
    return "Kova could not complete this operation. Please try again.";
  }

  return message;
}

export default function SnapToSellModal({
  open,
  onClose,
  businessId,
  accessToken,
  onCreated,
}: SnapToSellModalProps) {
  const cameraInputRef =
    useRef<HTMLInputElement | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const manualImageInputRef =
    useRef<HTMLInputElement | null>(null);

  const manualCameraInputRef =
    useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>("capture");

  const [images, setImages] = useState<ImagePreview[]>(
    [],
  );

  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("KES");

  const [product, setProduct] =
    useState<Product | null>(null);

  const [snapMode, setSnapMode] =
    useState<SnapMode>("single");

  const [offeringKind, setOfferingKind] =
    useState<OfferingKind>("product");

  const [batchProducts, setBatchProducts] = useState<
    Product[]
  >([]);

  const [batchErrors, setBatchErrors] = useState<
    SnapToSellBatchError[]
  >([]);

  const [batchPriceMode, setBatchPriceMode] =
    useState<BatchPriceMode>("shared");

  const [individualPrices, setIndividualPrices] =
    useState<string[]>([]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [material, setMaterial] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [condition, setCondition] = useState("");

  const [manualImage, setManualImage] =
    useState<File | null>(null);

  const [manualImagePreview, setManualImagePreview] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);

  /*
   * ---------------------------------------------------------------
   * RESET
   * ---------------------------------------------------------------
   */

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep("capture");
    setError("");
    setProduct(null);
    setSnapMode("single");
    setOfferingKind("product");
    setBatchProducts([]);
    setBatchErrors([]);
    setBatchPriceMode("shared");
    setIndividualPrices([]);

    setPrice("");
    setCurrency("KES");

    setName("");
    setCategory("");
    setBrand("");
    setMaterial("");
    setSize("");
    setColor("");
    setCondition("");

    setManualImage(null);

    if (manualImagePreview) {
      URL.revokeObjectURL(manualImagePreview);
    }

    setManualImagePreview(null);
  }, [open]);

  /*
   * Clean up object URLs when the component is unmounted.
   */

  useEffect(() => {
    return () => {
      images.forEach((image) => {
        URL.revokeObjectURL(image.url);
      });

      if (manualImagePreview) {
        URL.revokeObjectURL(manualImagePreview);
      }
    };
  }, []);

  if (!open) {
    return null;
  }

  /*
   * ---------------------------------------------------------------
   * COMMON ERROR HANDLER
   * ---------------------------------------------------------------
   */

  function renderError() {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
        <p className="text-sm leading-6 text-red-700">{error}</p>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------------
   * SNAP IMAGE HANDLING
   * ---------------------------------------------------------------
   */

  function addImages(files: File[]) {
    setError("");

    const validImages = files.filter((file) =>
      file.type.startsWith("image/"),
    );

    if (!validImages.length) {
      setError("Please select a valid product photo.");
      return;
    }

    const remaining =
      MAX_SNAP_PHOTOS - images.length;

    if (remaining <= 0) {
      setError(
        `You can use a maximum of ${MAX_SNAP_PHOTOS} photos.`,
      );
      return;
    }

    const selected = validImages.slice(0, remaining);

    const previews = selected.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setImages((current) => [
      ...current,
      ...previews,
    ]);
  }

  function handleCameraCapture(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(
      event.target.files || [],
    );

    addImages(files);

    event.target.value = "";
  }

  function handleFileSelection(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(
      event.target.files || [],
    );

    addImages(files);

    event.target.value = "";
  }

  function removeImage(index: number) {
    setImages((current) => {
      const image = current[index];

      if (image) {
        URL.revokeObjectURL(image.url);
      }

      return current.filter(
        (_, currentIndex) =>
          currentIndex !== index,
      );
    });
  }

  function openCamera() {
    setError("");
    cameraInputRef.current?.click();
  }

  function openFilePicker() {
    setError("");
    fileInputRef.current?.click();
  }

  /*
   * ---------------------------------------------------------------
   * MANUAL IMAGE HANDLING
   * ---------------------------------------------------------------
   */

  function handleManualImage(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid product image.");
      return;
    }

    setError("");

    if (manualImagePreview) {
      URL.revokeObjectURL(manualImagePreview);
    }

    setManualImage(file);

    setManualImagePreview(
      URL.createObjectURL(file),
    );

    event.target.value = "";
  }

  function removeManualImage() {
    if (manualImagePreview) {
      URL.revokeObjectURL(manualImagePreview);
    }

    setManualImage(null);
    setManualImagePreview(null);
  }

  function openManualCamera() {
    setError("");
    manualCameraInputRef.current?.click();
  }

  function openManualFilePicker() {
    setError("");
    manualImageInputRef.current?.click();
  }

  /*
   * ---------------------------------------------------------------
   * CAPTURE FLOW
   * ---------------------------------------------------------------
   */

  function continueFromCapture() {
    setError("");

    if (!images.length) {
      setError(
        "Take a product photo first, or choose Add Manually.",
      );

      return;
    }

    setIndividualPrices(
      Array.from({ length: images.length }, () => ""),
    );
    setStep("price");
  }

  function openManualMode() {
    setError("");
    setStep("manual");
  }

  /*
   * ---------------------------------------------------------------
   * SNAP TO SELL
   * ---------------------------------------------------------------
   */

  async function prepareProduct(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    const useBatch =
      snapMode === "batch" && images.length > 1;

    if (useBatch && batchPriceMode === "individual") {
      if (
        individualPrices.length !== images.length
      ) {
        setError("Enter a price for each photo.");
        return;
      }

      for (
        let index = 0;
        index < individualPrices.length;
        index += 1
      ) {
        const value = individualPrices[index]?.trim();

        if (!value) {
          setError(
            `Enter a price for photo ${index + 1}.`,
          );
          return;
        }

        const numeric = Number(value);

        if (
          !Number.isFinite(numeric) ||
          numeric < 0
        ) {
          setError(
            `Enter a valid price for photo ${index + 1}.`,
          );
          return;
        }
      }
    } else {
      const numericPrice = Number(price);

      if (!price.trim()) {
        setError("Enter the selling price.");
        return;
      }

      if (
        !Number.isFinite(numericPrice) ||
        numericPrice < 0
      ) {
        setError("Enter a valid selling price.");
        return;
      }
    }

    if (!images.length) {
      setError(
        offeringKind === "service"
          ? "Add at least one photo of the service."
          : "Take at least one product photo.",
      );
      return;
    }

    setStep("processing");

    try {
      const formData = new FormData();

      images.forEach(({ file }) => {
        formData.append("images", file);
      });

      if (
        useBatch &&
        batchPriceMode === "individual"
      ) {
        formData.append(
          "prices",
          JSON.stringify(individualPrices),
        );
      } else {
        formData.append("price", price);
      }

      formData.append("currency", currency);
      formData.append("offering_kind", offeringKind);

      if (useBatch) {
        const batchResult = await snapToSellBatch(
          businessId,
          accessToken,
          formData,
        );

        setBatchProducts(batchResult.products);
        setBatchErrors(batchResult.errors || []);
        invalidateCommerceCaches(businessId);
        setStep("batchReview");
        return;
      }

      const createdProduct = await snapToSell(
        businessId,
        accessToken,
        formData,
      );

      setProduct(createdProduct);
      invalidateCommerceCaches(businessId);

      setName(createdProduct.name || "");
      setCategory(createdProduct.category || "");
      setBrand(createdProduct.brand || "");
      setMaterial(createdProduct.material || "");
      setSize(createdProduct.size || "");
      setColor(createdProduct.color || "");
      setCondition(createdProduct.condition || "New");

      setStep("review");
    } catch (err) {
      setError(getErrorMessage(err));
      setStep("price");
    }
  }

  /*
   * ---------------------------------------------------------------
   * MANUAL PRODUCT CREATION
   * ---------------------------------------------------------------
   */

  async function saveManualProduct(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!category.trim()) {
      setError("Category is required.");
      return;
    }

    if (!price.trim()) {
      setError("Selling price is required.");
      return;
    }

    const numericPrice = Number(price);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      setError("Enter a valid selling price.");
      return;
    }

    setSaving(true);

    try {
      /*
       * First create the product.
       */
      const createdProduct =
        await authenticatedApiRequest<Product>(
          `/commerce/${businessId}/products/`,
          accessToken,
          {
            method: "POST",
            body: JSON.stringify({
              name: name.trim(),
              category: category.trim(),
              price,
              currency,
              brand: brand.trim(),
              material: offeringKind === "service" ? "" : material.trim(),
              size: offeringKind === "service" ? "" : size.trim(),
              color: color.trim(),
              condition: offeringKind === "service" ? "" : condition.trim(),
              offering_kind: offeringKind,
              status: "draft",
            }),
          },
        );

      /*
       * If the user supplied an image, upload it to
       * the newly-created product.
       */
      if (manualImage) {
        const imageFormData = new FormData();

        imageFormData.append(
          "image",
          manualImage,
        );

        imageFormData.append(
          "is_primary",
          "true",
        );

        imageFormData.append(
          "display_order",
          "0",
        );

        await authenticatedApiRequest(
          `/commerce/${businessId}/products/${createdProduct.id}/images/`,
          accessToken,
          {
            method: "POST",
            body: imageFormData,
          },
        );
      }

      setProduct(createdProduct);
      setStep("live");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /*
   * ---------------------------------------------------------------
   * SAVE AI-GENERATED PRODUCT
   * ---------------------------------------------------------------
   */

  async function saveProduct() {
    if (!product) {
      return;
    }

    setError("");
    setSaving(true);

    try {
      const updatedProduct = await updateProduct(
        businessId,
        product.id,
        accessToken,
        {
          name: name.trim(),
          category: category.trim(),
          brand: brand.trim(),
          material: material.trim(),
          size: size.trim(),
          color: color.trim(),
          condition: condition.trim(),
        },
      );

      setProduct(updatedProduct);
      setStep("live");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /*
   * ---------------------------------------------------------------
   * HEADER
   * ---------------------------------------------------------------
   */

  function renderHeader() {
    return (
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-kova-border bg-white px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h1
            id="snap-to-sell-title"
            className="text-lg font-semibold tracking-tight text-kova-dark sm:text-xl"
          >
            {offeringKind === "service" ? "Snap a service" : "Snap a product"}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
            Photo, price, then Kova drafts the listing.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Snap to Sell"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xl leading-none text-gray-400 transition hover:bg-kova-background hover:text-kova-dark"
        >
          ×
        </button>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------------
   * CAPTURE SCREEN
   * ---------------------------------------------------------------
   */

  function renderCaptureStep() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOfferingKind("product")}
            className={`h-11 rounded-md border text-sm font-semibold ${
              offeringKind === "product"
                ? "border-[#176B4D] bg-[#176B4D] text-white"
                : "border-[#E5E7E5] bg-white text-[#17211D]"
            }`}
          >
            Product
          </button>
          <button
            type="button"
            onClick={() => setOfferingKind("service")}
            className={`h-11 rounded-md border text-sm font-semibold ${
              offeringKind === "service"
                ? "border-[#176B4D] bg-[#176B4D] text-white"
                : "border-[#E5E7E5] bg-white text-[#17211D]"
            }`}
          >
            Service
          </button>
        </div>
        <p className="text-xs leading-5 text-gray-500">
          {offeringKind === "service"
            ? "Photograph the work, the space, or the result. Kova writes a service people can book."
            : "Photograph the item. Kova writes a product people can order."}
        </p>

        {/* Camera input */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraCapture}
          className="hidden"
        />

        {/* Device file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelection}
          className="hidden"
        />

        {images.length === 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={openCamera}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-kova-border bg-white px-3 py-2.5 text-sm font-semibold text-kova-dark transition hover:border-kova-dark sm:w-auto"
            >
              <CameraIcon />
              Take photo
            </button>
            <button
              type="button"
              onClick={openFilePicker}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-kova-border bg-white px-3 py-2.5 text-sm font-semibold text-kova-dark transition hover:border-kova-dark sm:w-auto"
            >
              <GalleryIcon />
              From device
            </button>
            <button
              type="button"
              onClick={openManualMode}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-kova-border bg-white px-3 py-2.5 text-sm font-semibold text-kova-dark transition hover:border-kova-dark sm:w-auto"
            >
              <PencilIcon />
              Type it in
            </button>
          </div>
        ) : (
          <>
            <div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {images.map((image, index) => (
                  <div
                    key={`${image.file.name}-${index}`}
                    className="group relative aspect-square overflow-hidden border border-[#E5E7E5] bg-[#FAFAF8]"
                  >
                    <img
                      src={image.url}
                      alt={`Product photo ${index + 1}`}
                      className="h-full w-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeImage(index)
                      }
                      aria-label={`Remove photo ${index + 1}`}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center bg-[#17211D] text-lg leading-none text-white opacity-0 transition group-hover:opacity-100"
                    >
                      ×
                    </button>

                    {index === 0 && (
                      <span className="absolute bottom-2 left-2 bg-white px-2 py-1 text-xs font-medium text-gray-500">
                        Primary
                      </span>
                    )}
                  </div>
                ))}

                {images.length < MAX_SNAP_PHOTOS && (
                  <>
                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex aspect-square flex-col items-center justify-center border border-dashed border-[#BFC8C3] bg-[#FAFAF8] text-sm font-semibold text-[#176B4D] transition hover:border-[#176B4D] hover:bg-white"
                    >
                      <CameraIcon />
                      <span className="mt-2 px-2 text-center text-xs sm:text-sm">
                        Take another photo
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="flex aspect-square flex-col items-center justify-center border border-dashed border-[#BFC8C3] bg-[#FAFAF8] text-sm font-semibold text-[#176B4D] transition hover:border-[#176B4D] hover:bg-white"
                    >
                      <GalleryIcon />
                      <span className="mt-2 px-2 text-center text-xs sm:text-sm">
                        Upload more
                      </span>
                    </button>
                  </>
                )}
              </div>

              <p className="mt-3 text-xs text-gray-500">
                {images.length} of {MAX_SNAP_PHOTOS}{" "}
                {images.length === 1
                  ? "photo"
                  : "photos"}{" "}
                added
                {images.length < MAX_SNAP_PHOTOS
                  ? " · take another or upload several at once"
                  : ""}
              </p>

              {images.length < MAX_SNAP_PHOTOS ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={openCamera}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-kova-border bg-white px-3 py-2.5 text-sm font-semibold text-kova-dark transition hover:border-kova-dark sm:w-auto"
                  >
                    <CameraIcon />
                    Take another photo
                  </button>
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-kova-border bg-white px-3 py-2.5 text-sm font-semibold text-kova-dark transition hover:border-kova-dark sm:w-auto"
                  >
                    <GalleryIcon />
                    Upload more photos
                  </button>
                </div>
              ) : null}

              {images.length > 1 && (
                <div className="mt-5 space-y-3 border border-[#E5E7E5] bg-white p-4">
                  <p className="text-sm font-semibold text-[#17211D]">
                    How should Kova use these photos?
                  </p>

                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="snap-mode"
                      checked={snapMode === "single"}
                      onChange={() =>
                        setSnapMode("single")
                      }
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-[#17211D]">
                        One product
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                        All photos are angles of the same
                        item. Kova analyzes them together.
                      </span>
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="snap-mode"
                      checked={snapMode === "batch"}
                      onChange={() =>
                        setSnapMode("batch")
                      }
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-[#17211D]">
                        Separate products (batch)
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                        Each photo becomes its own product.
                        Kova scans up to{" "}
                        {MAX_SNAP_PHOTOS} images in
                        parallel.
                      </span>
                    </span>
                  </label>
                </div>
              )}
            </div>

            {error && renderError()}

            <div className="flex items-center justify-between border-t border-[#E5E7E5] pt-5">
              <button
                type="button"
                onClick={() => {
                  images.forEach((image) => {
                    URL.revokeObjectURL(
                      image.url,
                    );
                  });

                  setImages([]);
                }}
                className="text-sm font-medium text-gray-500 transition hover:text-[#17211D]"
              >
                Start again
              </button>

              <button
                type="button"
                onClick={continueFromCapture}
                className="bg-[#176B4D] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F]"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {images.length === 0 && error && renderError()}
      </div>
    );
  }

  /*
   * ---------------------------------------------------------------
   * PRICE SCREEN
   * ---------------------------------------------------------------
   */

  function renderPriceStep() {
    const isBatchPricing =
      snapMode === "batch" && images.length > 1;

    return (
      <form
        onSubmit={prepareProduct}
        className="space-y-6"
      >
        <div>
          <button
            type="button"
            onClick={() => setStep("capture")}
            className="mb-5 text-sm font-medium text-gray-500 hover:text-[#17211D]"
          >
            ← Back
          </button>

          <p className="text-sm font-medium text-[#176B4D]">
            {isBatchPricing
              ? "Your photos are ready for Kova."
              : "Your product is ready for Kova."}
          </p>

          <h2 className="mt-1 text-lg font-semibold text-kova-dark">
            {isBatchPricing ? "Set prices" : "Your selling price"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
            Kova does not guess price from photos — you set it.
          </p>
        </div>

        {isBatchPricing && (
          <div className="space-y-3 border border-[#E5E7E5] bg-white p-4">
            <p className="text-sm font-semibold text-[#17211D]">
              Pricing for this batch
            </p>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="batch-price-mode"
                checked={batchPriceMode === "shared"}
                onChange={() =>
                  setBatchPriceMode("shared")
                }
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-[#17211D]">
                  Shared price
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                  One amount applies to every product in this
                  batch.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="batch-price-mode"
                checked={
                  batchPriceMode === "individual"
                }
                onChange={() => {
                  setBatchPriceMode("individual");
                  setIndividualPrices((current) => {
                    if (
                      current.length === images.length
                    ) {
                      return current;
                    }

                    return Array.from(
                      { length: images.length },
                      (_, index) =>
                        current[index] ??
                        price ??
                        "",
                    );
                  });
                }}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-[#17211D]">
                  Price per photo
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                  Enter a selling price for each product
                  separately.
                </span>
              </span>
            </label>
          </div>
        )}

        <div>
          <label
            htmlFor="currency"
            className="mb-2 block text-sm font-medium text-[#17211D]"
          >
            Currency
          </label>

          <select
            id="currency"
            value={currency}
            onChange={(event) =>
              setCurrency(event.target.value)
            }
            className="h-14 w-full max-w-xs border border-[#E5E7E5] bg-white px-4 text-base text-[#17211D] outline-none transition focus:border-[#176B4D]"
          >
            <option value="KES">KES</option>
            <option value="USD">USD</option>
            <option value="UGX">UGX</option>
            <option value="TZS">TZS</option>
            <option value="RWF">RWF</option>
          </select>
        </div>

        {isBatchPricing &&
        batchPriceMode === "individual" ? (
          <ul className="divide-y divide-[#E5E7E5] border border-[#E5E7E5] bg-white">
            {images.map((image, index) => (
              <li
                key={`${image.file.name}-${index}-price`}
                className="flex items-center gap-4 px-4 py-3"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden border border-[#E5E7E5] bg-[#FAFAF8]">
                  <img
                    src={image.url}
                    alt={`Product photo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={`photo-price-${index}`}
                    className="mb-1 block text-xs font-medium text-gray-500"
                  >
                    Photo {index + 1} price
                  </label>

                  <input
                    id={`photo-price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      individualPrices[index] ?? ""
                    }
                    onChange={(event) => {
                      const value =
                        event.target.value;

                      setIndividualPrices(
                        (current) => {
                          const next = [
                            ...current,
                          ];
                          next[index] = value;
                          return next;
                        },
                      );
                    }}
                    placeholder="2300"
                    className="h-12 w-full border border-[#E5E7E5] bg-white px-3 text-base text-[#17211D] outline-none transition focus:border-[#176B4D]"
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div>
            <label
              htmlFor="selling-price"
              className="mb-2 block text-sm font-medium text-[#17211D]"
            >
              {isBatchPricing
                ? offeringKind === "service"
                  ? "Shared price"
                  : "Shared selling price"
                : offeringKind === "service"
                  ? "Price"
                  : "Selling price"}
            </label>

            <input
              id="selling-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) =>
                setPrice(event.target.value)
              }
              placeholder="2300"
              autoFocus
              className="h-14 w-full max-w-md border border-[#E5E7E5] bg-white px-4 text-base text-[#17211D] outline-none transition focus:border-[#176B4D]"
            />
          </div>
        )}

        <p className="text-xs leading-5 text-gray-500">
          Your price is never changed without you.
        </p>

        {error && renderError()}

        <div className="flex justify-end border-t border-[#E5E7E5] pt-5">
          <button
            type="submit"
            className="bg-[#176B4D] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F]"
          >
            {isBatchPricing
              ? "Prepare products"
              : "Prepare product"}
          </button>
        </div>
      </form>
    );
  }

  /*
   * ---------------------------------------------------------------
   * PROCESSING
   * ---------------------------------------------------------------
   */

  function renderProcessingStep() {
    const isBatch =
      snapMode === "batch" && images.length > 1;

    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center py-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center border border-[#176B4D]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E7E5] border-t-[#176B4D]" />
        </div>

        <h2 className="mt-6 text-xl font-semibold text-[#17211D]">
          {isBatch
            ? "Kova is preparing your products"
            : "Kova is preparing your product"}
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
          {isBatch
            ? `Kova is analyzing ${images.length} photos in parallel using your Business Brain to create separate product drafts.`
            : "Kova is looking at your photos together with your Business Brain to understand the product and prepare its selling information."}
        </p>

        <div className="mt-8 flex items-center gap-2 text-xs font-medium text-gray-500">
          <span>Understanding</span>
          <span className="text-gray-300">·</span>
          <span>Preparing</span>
          <span className="text-gray-300">·</span>
          <span>Review</span>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------------
   * MANUAL PRODUCT
   * ---------------------------------------------------------------
   */

  function renderManualStep() {
    return (
      <form
        onSubmit={saveManualProduct}
        className="space-y-6"
      >
        <div>
          <button
            type="button"
            onClick={() => setStep("capture")}
            className="mb-5 text-sm font-medium text-gray-500 transition hover:text-[#17211D]"
          >
            ← Back
          </button>

          <p className="text-xs font-medium text-gray-500">
            Add manually
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#17211D]">
            Add your product details
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Add the information you know. Kova will use these
            facts as the authoritative product information.
          </p>
        </div>

        {/* -------------------------------------------------------
            PRODUCT IMAGE
        ------------------------------------------------------- */}

        <section className="border border-[#E5E7E5] bg-white">
          <div className="border-b border-[#E5E7E5] px-5 py-5">
            <p className="text-xs font-medium text-gray-500">
              Product image
            </p>

            <h3 className="mt-2 text-lg font-semibold text-[#17211D]">
              Add a photo
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Add a clear image of the product. This will become
              the primary product image.
            </p>
          </div>

          <div className="p-5">
            <input
              ref={manualImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleManualImage}
              className="hidden"
            />

            <input
              ref={manualCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleManualImage}
              className="hidden"
            />

            {manualImagePreview ? (
              <div className="flex flex-col gap-5 sm:flex-row">
                <div className="relative h-48 w-48 shrink-0 overflow-hidden border border-[#E5E7E5] bg-[#FAFAF8]">
                  <img
                    src={manualImagePreview}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={removeManualImage}
                    aria-label="Remove product image"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center bg-[#17211D] text-lg leading-none text-white"
                  >
                    ×
                  </button>
                </div>

                <div className="flex flex-col justify-center">
                  <p className="break-all text-sm font-medium text-[#17211D]">
                    {manualImage?.name}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    This image will be saved as the primary
                    product image.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-4">
                    <button
                      type="button"
                      onClick={openManualCamera}
                      className="text-sm font-medium text-[#176B4D] hover:underline"
                    >
                      Take another photo
                    </button>

                    <button
                      type="button"
                      onClick={openManualFilePicker}
                      className="text-sm font-medium text-gray-500 hover:text-[#17211D]"
                    >
                      Choose another image
                    </button>

                    <button
                      type="button"
                      onClick={removeManualImage}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={openManualCamera}
                  className="flex min-h-[130px] flex-col items-center justify-center gap-3 border border-[#176B4D] bg-[#176B4D] px-5 py-5 text-sm font-semibold text-white transition hover:bg-[#12583F]"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 7.5C4 6.67 4.67 6 5.5 6H8L9.5 4H14.5L16 6H18.5C19.33 6 20 6.67 20 7.5V18.5C20 19.33 19.33 20 18.5 20H5.5C4.67 20 4 19.33 4 18.5V7.5Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <circle
                      cx="12"
                      cy="13"
                      r="3.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>

                  <span>
                    Take a photo
                  </span>

                  <span className="text-xs font-normal text-white/70">
                    Use your camera
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openManualFilePicker}
                  className="flex min-h-[130px] flex-col items-center justify-center gap-3 border border-[#E5E7E5] bg-[#FAFAF8] px-5 py-5 text-sm font-semibold text-[#17211D] transition hover:border-[#176B4D] hover:text-[#176B4D]"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 5.5C4 4.67 4.67 4 5.5 4H18.5C19.33 4 20 4.67 20 5.5V18.5C20 19.33 19.33 20 18.5 20H5.5C4.67 20 4 19.33 4 18.5V5.5Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />

                    <circle
                      cx="8.5"
                      cy="8.5"
                      r="1.3"
                      fill="currentColor"
                    />

                    <path
                      d="M4 16L9 11L13 15L15.5 12.5L20 17"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <span>
                    Choose from device
                  </span>

                  <span className="text-xs font-normal text-gray-500">
                    Upload an existing photo
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* -------------------------------------------------------
            PRODUCT INFORMATION
        ------------------------------------------------------- */}

        <section className="border border-[#E5E7E5] bg-white">
          <div className="border-b border-[#E5E7E5] px-5 py-5">
            <p className="text-xs font-medium text-gray-500">
              Product information
            </p>

            <h3 className="mt-2 text-lg font-semibold text-[#17211D]">
              Add your product details
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Only add facts you know. Kova will use them as
              authoritative information.
            </p>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
              {/* Product name */}
              <div className="md:col-span-2">
                <label
                  htmlFor="manual-name"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Product name *
                </label>

                <input
                  id="manual-name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="e.g. Men's denim jacket"
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none transition focus:border-[#176B4D]"
                />
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="manual-category"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Category *
                </label>

                <input
                  id="manual-category"
                  type="text"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                  placeholder="e.g. Jackets"
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none transition focus:border-[#176B4D]"
                />
              </div>

              {/* Price */}
              <div>
                <label
                  htmlFor="manual-price"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  {offeringKind === "service" ? "Price *" : "Selling price *"}
                </label>

                <div className="mt-2 flex">
                  <input
                    id="manual-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(event) =>
                      setPrice(event.target.value)
                    }
                    placeholder="2300"
                    className="h-12 min-w-0 flex-1 border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                  />

                  <select
                    value={currency}
                    onChange={(event) =>
                      setCurrency(event.target.value)
                    }
                    className="h-12 w-24 border-y border-r border-[#E5E7E5] bg-[#FAFAF8] px-2 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                  >
                    <option value="KES">
                      KES
                    </option>

                    <option value="USD">
                      USD
                    </option>

                    <option value="UGX">
                      UGX
                    </option>

                    <option value="TZS">
                      TZS
                    </option>

                    <option value="RWF">
                      RWF
                    </option>
                  </select>
                </div>
              </div>

              {/* Brand */}
              <div>
                <label
                  htmlFor="manual-brand"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Brand
                </label>

                <input
                  id="manual-brand"
                  type="text"
                  value={brand}
                  onChange={(event) =>
                    setBrand(event.target.value)
                  }
                  placeholder="If known"
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                />
              </div>

              {offeringKind === "product" ? (
              <>
              {/* Material */}
              <div>
                <label
                  htmlFor="manual-material"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Material
                </label>

                <input
                  id="manual-material"
                  type="text"
                  value={material}
                  onChange={(event) =>
                    setMaterial(event.target.value)
                  }
                  placeholder="If known"
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                />
              </div>

              {/* Size */}
              <div>
                <label
                  htmlFor="manual-size"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Size
                </label>

                <input
                  id="manual-size"
                  type="text"
                  value={size}
                  onChange={(event) =>
                    setSize(event.target.value)
                  }
                  placeholder="e.g. M, L, XL"
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                />
              </div>

              {/* Color */}
              <div>
                <label
                  htmlFor="manual-color"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Color
                </label>

                <input
                  id="manual-color"
                  type="text"
                  value={color}
                  onChange={(event) =>
                    setColor(event.target.value)
                  }
                  placeholder="e.g. Black"
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                />
              </div>

              {/* Condition */}
              <div className="md:col-span-2">
                <label
                  htmlFor="manual-condition"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Condition
                </label>

                <input
                  id="manual-condition"
                  type="text"
                  value={condition}
                  onChange={(event) =>
                    setCondition(event.target.value)
                  }
                  placeholder="e.g. New, excellent, good"
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                />
              </div>
              </>
              ) : null}
            </div>
          </div>
        </section>

        {error && renderError()}

        <div className="flex items-center justify-between border-t border-[#E5E7E5] pt-5">
          <button
            type="button"
            onClick={() => setStep("capture")}
            disabled={saving}
            className="text-sm font-medium text-gray-500 transition hover:text-[#17211D] disabled:opacity-50"
          >
            Back
          </button>

          <button
            type="submit"
            disabled={saving}
            className="bg-[#176B4D] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving product..."
              : "Save product"}
          </button>
        </div>
      </form>
    );
  }

  /*
   * ---------------------------------------------------------------
   * AI REVIEW SCREEN
   * ---------------------------------------------------------------
   */

  function finishLive() {
    if (product) {
      onCreated?.(product);
    }
    onClose();
  }

  function finishBatch() {
    batchProducts.forEach((item) => {
      onCreated?.(item);
    });
    onClose();
  }

  function renderBatchReviewStep() {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium text-gray-500">
            Batch complete
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#17211D]">
            {batchProducts.length}{" "}
            {batchProducts.length === 1
              ? "product"
              : "products"}{" "}
            prepared
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Each photo was analyzed separately. Draft products
            are on your store with the price you set. You can
            edit details from your product list anytime.
          </p>
        </div>

        {batchErrors.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">
              {batchErrors.length}{" "}
              {batchErrors.length === 1
                ? "photo could"
                : "photos could"}{" "}
              not be analyzed
            </p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {batchErrors.map((item) => (
                <li key={`${item.index}-${item.filename}`}>
                  {item.filename}: {item.detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="divide-y divide-[#E5E7E5] border border-[#E5E7E5] bg-white">
          {batchProducts.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#17211D]">
                  {item.name || "Untitled product"}
                </p>
                {item.category && (
                  <p className="truncate text-xs text-gray-500">
                    {item.category}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-sm font-medium text-[#176B4D]">
                {item.currency}{" "}
                {item.price ?? price}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex justify-end border-t border-[#E5E7E5] pt-5">
          <button
            type="button"
            onClick={finishBatch}
            className="bg-[#176B4D] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F]"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  function renderLiveStep() {
    if (!product) {
      return null;
    }

    return (
      <div className="flex flex-col items-center py-6 text-center">
        <p className="text-xs font-medium text-kova-green">
          Saved
        </p>
        <h2 className="mt-2 text-lg font-semibold text-kova-dark">
          {product.name} is on your store
        </h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-gray-500">
          Customers can buy this product on its own page, or browse every product in your store. Share either link.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {product.product_path && (
            <a
              href={product.product_path}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#176B4D] px-6 py-3 text-sm font-semibold text-white hover:bg-[#12583F]"
            >
              Open product page
            </a>
          )}
          {product.store_path && (
            <a
              href={product.store_path}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-[#E5E7E5] px-6 py-3 text-sm font-semibold text-[#17211D] hover:border-[#176B4D]"
            >
              Open full store
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={finishLive}
          className="mt-8 text-sm font-medium text-gray-500 hover:text-[#17211D]"
        >
          Done
        </button>
      </div>
    );
  }

  function renderReviewStep() {
    if (!product) {
      return null;
    }

    const uncertainAttributes =
      product.uncertain_attributes || [];

    return (
      <div className="space-y-5">
        <div>
          <button
            type="button"
            onClick={() => setStep("price")}
            className="mb-5 text-sm font-medium text-gray-500 hover:text-[#17211D]"
          >
            ← Back
          </button>

          <p className="text-xs font-medium text-gray-500">
            Product draft
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#17211D]">
            Review what Kova prepared
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Kova has analyzed your product photos using your
            Business Brain. Review the product facts before
            saving.
          </p>
        </div>

        {product.ai_summary && (
          <div className="border border-[#E5E7E5] bg-[#FAFAF8] px-5 py-4">
            <p className="text-xs font-medium text-gray-400">
              Kova's understanding
            </p>

            <p className="mt-2 text-sm leading-6 text-[#17211D]">
              {product.ai_summary}
            </p>
          </div>
        )}

        {uncertainAttributes.length > 0 && (
          <div className="border border-[#F4B183] bg-[#FFF9F4] px-5 py-4">
            <p className="text-sm font-semibold text-[#17211D]">
              A few details need your attention
            </p>

            <p className="mt-1 text-sm leading-6 text-gray-600">
              Kova could not confidently determine some
              attributes from the photographs.
            </p>

            <ul className="mt-3 space-y-1">
              {uncertainAttributes.map(
                (attribute, index) => (
                  <li
                    key={`${attribute}-${index}`}
                    className="text-sm text-gray-600"
                  >
                    • {attribute}
                  </li>
                ),
              )}
            </ul>
          </div>
        )}

        <section className="border border-[#E5E7E5] bg-white">
          <div className="border-b border-[#E5E7E5] px-5 py-5">
            <p className="text-xs font-medium text-gray-500">
              Product information
            </p>

            <h3 className="mt-2 text-lg font-semibold text-[#17211D]">
              Review the product facts
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              These are facts you control.
            </p>
          </div>

          <div className="p-5">
            <div className="mb-6 border border-[#E5E7E5] bg-[#FAFAF8] px-4 py-4">
              <p className="text-sm font-semibold text-[#17211D]">
                Owner-provided information
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Kova will treat these details as authoritative
                business information.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label
                  htmlFor="product-name"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Product name
                </label>

                <input
                  id="product-name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="product-category"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Category
                </label>

                <input
                  id="product-category"
                  type="text"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                />
              </div>

              <div>
                <label
                  htmlFor="product-brand"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Brand
                </label>

                <input
                  id="product-brand"
                  type="text"
                  value={brand}
                  onChange={(event) =>
                    setBrand(event.target.value)
                  }
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                />
              </div>

              {offeringKind === "product" ? (
              <>
              <div>
                <label
                  htmlFor="product-material"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Material
                </label>

                <input
                  id="product-material"
                  type="text"
                  value={material}
                  onChange={(event) =>
                    setMaterial(event.target.value)
                  }
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                />
              </div>

              <div>
                <label
                  htmlFor="product-size"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Size
                </label>

                <input
                  id="product-size"
                  type="text"
                  value={size}
                  onChange={(event) =>
                    setSize(event.target.value)
                  }
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                />
              </div>

              <div>
                <label
                  htmlFor="product-color"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Color
                </label>

                <input
                  id="product-color"
                  type="text"
                  value={color}
                  onChange={(event) =>
                    setColor(event.target.value)
                  }
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="product-condition"
                  className="block text-sm font-medium text-[#17211D]"
                >
                  Condition
                </label>

                <input
                  id="product-condition"
                  type="text"
                  value={condition}
                  onChange={(event) =>
                    setCondition(event.target.value)
                  }
                  className="mt-2 h-12 w-full border border-[#E5E7E5] px-4 text-sm text-[#17211D] outline-none focus:border-[#176B4D]"
                />
              </div>
              </>
              ) : null}
            </div>
          </div>
        </section>

        {error && renderError()}

        <div className="flex items-center justify-between border-t border-[#E5E7E5] pt-5">
          <button
            type="button"
            onClick={() => setStep("price")}
            disabled={saving}
            className="text-sm font-medium text-gray-500 hover:text-[#17211D] disabled:opacity-50"
          >
            Back
          </button>

          <button
            type="button"
            onClick={saveProduct}
            disabled={
              saving ||
              !name.trim()
            }
            className="bg-[#176B4D] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#12583F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving product..."
              : "Save product"}
          </button>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------------
   * MODAL
   * ---------------------------------------------------------------
   */

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-kova-dark/50 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="snap-to-sell-title"
        className="flex max-h-[min(100dvh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-t-xl bg-white shadow-xl sm:rounded-xl"
      >
        {renderHeader()}

        <div className="min-h-0 flex-1 overflow-y-auto bg-kova-background">
          <div className="px-4 py-4 sm:px-5 sm:py-5">
            {step === "capture" && renderCaptureStep()}
            {step === "price" && renderPriceStep()}
            {step === "processing" && renderProcessingStep()}
            {step === "review" && renderReviewStep()}
            {step === "batchReview" && renderBatchReviewStep()}
            {step === "manual" && renderManualStep()}
            {step === "live" && renderLiveStep()}
          </div>
        </div>
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5C4 6.67 4.67 6 5.5 6H8L9.5 4H14.5L16 6H18.5C19.33 6 20 6.67 20 7.5V18.5C20 19.33 19.33 20 18.5 20H5.5C4.67 20 4 19.33 4 18.5V7.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5.5C4 4.67 4.67 4 5.5 4H18.5C19.33 4 20 4.67 20 5.5V18.5C20 19.33 19.33 20 18.5 20H5.5C4.67 20 4 19.33 4 18.5V5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" />
      <path
        d="M4 16L9 11L13 15L15.5 12.5L20 17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19.5V16.5L15.5 5C16.33 4.17 17.67 4.17 18.5 5L19 5.5C19.83 6.33 19.83 7.67 19 8.5L7.5 20H4V19.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 6.5L17.5 10" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}