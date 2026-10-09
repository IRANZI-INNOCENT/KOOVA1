"use client";

import { useEffect, useState } from "react";
import { Product } from "./types";

interface ProductFormProps {
  product: Product;
  saving?: boolean;
  onSave: (data: Partial<Product>) => Promise<void>;
}

interface FormState {
  name: string;
  sku: string;
  category: string;
  price: string;
  currency: string;
  stock: string;
  brand: string;
  material: string;
  size: string;
  color: string;
  condition: string;
  short_description: string;
  description: string;
}

export function ProductForm({
  product,
  saving = false,
  onSave,
}: ProductFormProps) {
  const [form, setForm] = useState<FormState>({
    name: product.name || "",
    sku: product.sku || "",
    category: product.category || "",
    price: product.price || "",
    currency: product.currency || "KES",
    stock: product.stock === null ? "" : String(product.stock),
    brand: product.brand || "",
    material: product.material || "",
    size: product.size || "",
    color: product.color || "",
    condition: product.condition || "",
    short_description: product.short_description || "",
    description: product.description || "",
  });

  useEffect(() => {
    setForm({
      name: product.name || "",
      sku: product.sku || "",
      category: product.category || "",
      price: product.price || "",
      currency: product.currency || "KES",
      stock: product.stock === null ? "" : String(product.stock),
      brand: product.brand || "",
      material: product.material || "",
      size: product.size || "",
      color: product.color || "",
      condition: product.condition || "",
      short_description: product.short_description || "",
      description: product.description || "",
    });
  }, [product]);

  function update(
    field: keyof FormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    await onSave({
      ...form,
      stock: form.stock === "" ? null : Number(form.stock),
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[#E5E7E5] bg-white p-6"
    >
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#176B4D]">
          Product facts
        </p>
        <h2 className="mt-1 text-xl font-semibold text-[#17211D]">
          Information you control
        </h2>
        <p className="mt-1 text-sm text-[#69736D]">
          These facts are the source Kova should trust when generating
          commerce and social content.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Product name"
          value={form.name}
          onChange={(value) => update("name", value)}
          required
        />

        <Field
          label="SKU"
          value={form.sku}
          onChange={(value) => update("sku", value)}
        />

        <Field
          label="Category"
          value={form.category}
          onChange={(value) => update("category", value)}
        />

        <Field
          label="Price"
          value={form.price}
          onChange={(value) => update("price", value)}
          type="number"
        />

        <Field
          label="Currency"
          value={form.currency}
          onChange={(value) => update("currency", value)}
        />

        <Field
          label="Stock"
          value={form.stock}
          onChange={(value) => update("stock", value)}
          type="number"
        />

        <Field
          label="Brand"
          value={form.brand}
          onChange={(value) => update("brand", value)}
        />

        <Field
          label="Material"
          value={form.material}
          onChange={(value) => update("material", value)}
        />

        <Field
          label="Size"
          value={form.size}
          onChange={(value) => update("size", value)}
        />

        <Field
          label="Color"
          value={form.color}
          onChange={(value) => update("color", value)}
        />

        <Field
          label="Condition"
          value={form.condition}
          onChange={(value) => update("condition", value)}
        />
      </div>

      <div className="mt-5 space-y-5">
        <TextArea
          label="Short description"
          value={form.short_description}
          onChange={(value) => update("short_description", value)}
          rows={3}
        />

        <TextArea
          label="Description"
          value={form.description}
          onChange={(value) => update("description", value)}
          rows={6}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#176B4D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#12553D] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save product"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#35413B]">
        {label}
      </span>

      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#DCE0DC] bg-white px-4 py-3 text-sm text-[#17211D] outline-none transition placeholder:text-[#9AA19D] focus:border-[#176B4D] focus:ring-2 focus:ring-[#176B4D]/10"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#35413B]">
        {label}
      </span>

      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-xl border border-[#DCE0DC] bg-white px-4 py-3 text-sm leading-6 text-[#17211D] outline-none transition placeholder:text-[#9AA19D] focus:border-[#176B4D] focus:ring-2 focus:ring-[#176B4D]/10"
      />
    </label>
  );
}