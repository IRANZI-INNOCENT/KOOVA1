import type { Product } from "@/lib/commerce";

export function whatsappNumberForLink(number: string) {
  return number.replace(/\D/g, "");
}

export function buildStoreWhatsAppMessage(businessName: string) {
  const name = businessName.trim() || "your shop";
  return [
    `Hello ${name},`,
    "",
    "I found your store and would like to ask about your products.",
    "Please share availability and delivery options.",
  ].join("\n");
}

export function whatsappLink(number: string, text?: string) {
  const cleaned = whatsappNumberForLink(number);
  const message = text ?? "Hi, I would like to place an order.";
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export interface WhatsAppOrderMessageInput {
  businessName: string;
  productName: string;
  productUrl: string;
  currency: string;
  unitPrice: string | null;
  quantity?: number;
  size?: string;
  color?: string;
  service?: boolean;
}

export function buildWhatsAppOrderMessage(input: WhatsAppOrderMessageInput) {
  const qty = Math.max(1, input.quantity ?? 1);
  const lines = [
    `Hello ${input.businessName.trim() || "there"},`,
    "",
    "I would like to order:",
    "",
    `Product: ${input.productName}`,
  ];
  if (input.color?.trim()) lines.push(`Colour: ${input.color.trim()}`);
  if (input.size?.trim()) lines.push(`Size: ${input.size.trim()}`);
  lines.push(`Quantity: ${qty}`);

  if (input.unitPrice) {
    const amount = Number(input.unitPrice);
    if (Number.isFinite(amount)) {
      const unit = `${input.currency} ${Math.round(amount).toLocaleString("en-KE")}`;
      lines.push(`Listed price: ${unit}`);
      if (qty > 1) {
        lines.push(
          `Subtotal: ${input.currency} ${Math.round(amount * qty).toLocaleString("en-KE")}`,
        );
      }
    }
  }

  lines.push("", `Product link: ${input.productUrl}`);
  lines.push(
    "",
    "Please confirm availability and delivery options. This is an enquiry — not a confirmed payment.",
  );
  return lines.join("\n");
}

/** @deprecated use buildWhatsAppOrderMessage */
export function orderMessageText(input: {
  productName: string;
  productUrl: string;
  priceLabel?: string;
  service?: boolean;
  imageUrl?: string;
  businessName?: string;
  quantity?: number;
  size?: string;
  color?: string;
  currency?: string;
}) {
  if (input.businessName) {
    return buildWhatsAppOrderMessage({
      businessName: input.businessName,
      productName: input.productName,
      productUrl: input.productUrl,
      currency: input.currency || "KES",
      unitPrice: input.priceLabel?.replace(/[^\d.]/g, "") || null,
      quantity: input.quantity,
      size: input.size,
      color: input.color,
      service: input.service,
    });
  }
  const lines = [
    input.service
      ? `Hi, I want to ask about ${input.productName}.`
      : `Hi, I want to order ${input.productName}.`,
  ];
  if (input.priceLabel) lines.push(input.priceLabel);
  if (input.productUrl) lines.push("", input.productUrl);
  return lines.join("\n");
}

export function whatsappOrderLink(input: {
  number: string;
  productName: string;
  productUrl: string;
  priceLabel?: string;
  service?: boolean;
  businessName?: string;
  quantity?: number;
  size?: string;
  color?: string;
  currency?: string;
}) {
  const cleaned = whatsappNumberForLink(input.number);
  const text = orderMessageText(input);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

export function formatPrice(currency: string, price: string | null) {
  if (!price) return "Price on request";
  const amount = Number(price);
  if (!Number.isFinite(amount)) return `${currency} ${price}`;
  return `${currency} ${Math.round(amount).toLocaleString("en-KE")}`;
}

export function listingFacts(product: {
  size?: string;
  color?: string;
  brand?: string;
}) {
  return [product.brand, product.size, product.color]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" · ");
}

export function productAttributeFacts(product: Product): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value?: string) => {
    const row = (value || "").trim();
    if (row) rows.push({ label, value: row });
  };

  push("Brand", product.brand);
  push("Category", product.category);
  push("Colour", product.color);
  push("Size", product.size);
  push("Material", product.material);
  push("Condition", product.condition);

  const attrs = product.visual_attributes || {};
  const industryKeys: Record<string, string> = {
    model: "Model",
    warranty: "Warranty",
    storage: "Storage",
    weight: "Weight",
    volume: "Volume",
    dimensions: "Dimensions",
    skin_type: "Skin type",
    ingredients: "Ingredients",
  };
  for (const [key, label] of Object.entries(industryKeys)) {
    const raw = attrs[key];
    if (typeof raw === "string") push(label, raw);
  }

  return rows;
}

export function storeHeadline(page: {
  tagline?: string;
  title?: string;
  business_name?: string;
  location?: string;
}) {
  const location = page.location?.trim() || "";
  let raw = (page.tagline || page.title || page.business_name || "").trim();
  if (location && raw.toLowerCase().endsWith(location.toLowerCase())) {
    raw = raw.slice(0, raw.length - location.length).replace(/[,\s]+$/, "");
  }
  return {
    lead: raw || page.business_name || "Your shop",
    accent: location,
  };
}

export function storeHeroSubtitle(page: {
  description?: string;
  tagline?: string;
}) {
  const text = (page.description || page.tagline || "").trim();
  if (!text) return "";
  const sentence = text.split(/(?<=[.!?])\s+/)[0] || text;
  return sentence.length > 140 ? `${sentence.slice(0, 137).trim()}…` : sentence;
}

export function displayStorePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length >= 12) {
    return `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 12)}`;
  }
  return raw.trim();
}

export function offeringGridClass(layout?: string) {
  if (layout === "gallery") return "grid-cols-1 sm:grid-cols-2";
  if (layout === "editorial") return "grid-cols-2 lg:grid-cols-3";
  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
}

export type SortKey =
  | "featured"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "name_asc";

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const copy = [...products];
  if (sort === "featured") return copy;
  if (sort === "newest") {
    return copy.sort((a, b) =>
      (b.updated_at || "").localeCompare(a.updated_at || ""),
    );
  }
  if (sort === "name_asc") {
    return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (sort === "price_asc" || sort === "price_desc") {
    return copy.sort((a, b) => {
      const av = Number(a.price);
      const bv = Number(b.price);
      const aNum = Number.isFinite(av) ? av : sort === "price_asc" ? Infinity : -1;
      const bNum = Number.isFinite(bv) ? bv : sort === "price_asc" ? Infinity : -1;
      return sort === "price_asc" ? aNum - bNum : bNum - aNum;
    });
  }
  return copy;
}

export function uniqueCategories(products: Product[]): string[] {
  const set = new Set<string>();
  for (const product of products) {
    const cat = (product.category || "").trim();
    if (cat) set.add(cat);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
