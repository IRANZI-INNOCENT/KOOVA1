export function whatsappLink(number: string, productName?: string) {
  const cleaned = number.replace(/\D/g, "");
  const text = productName
    ? `Hi, I want to order ${productName}. Is it available?`
    : "Hi, I want to place an order from your KCOVA store.";

  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

/** Words that go with the product photo in the order message. */
export function orderMessageText(input: {
  productName: string;
  productUrl: string;
  priceLabel?: string;
  service?: boolean;
  imageUrl?: string;
}) {
  const lines = [
    input.service
      ? `Hi, I want to ask about ${input.productName}.`
      : `Hi, I want to order ${input.productName}.`,
  ];
  if (input.priceLabel) lines.push(input.priceLabel);
  if (input.productUrl) lines.push("", input.productUrl);
  if (input.imageUrl) lines.push(input.imageUrl);
  return lines.join("\n");
}

/** WhatsApp chat a customer opens when they order one listing. */
export function whatsappOrderLink(input: {
  number: string;
  productName: string;
  productUrl: string;
  priceLabel?: string;
  service?: boolean;
  imageUrl?: string;
}) {
  const cleaned = input.number.replace(/\D/g, "");
  const text = orderMessageText(input);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

export function formatPrice(currency: string, price: string | null) {
  if (!price) return "Price on request";
  const amount = Number(price);
  if (!Number.isFinite(amount)) return `${currency} ${price}`;
  return `${currency} ${Math.round(amount).toLocaleString("en-KE")}`;
}

export function listingFacts(product: { size?: string; color?: string }) {
  return [product.size, product.color]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" · ");
}

/** Banner headline and the location line under it. Same rules as the public shop. */
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

/** First sentence of the shop story, shown on the banner. */
export function storeHeroSubtitle(page: {
  description?: string;
  tagline?: string;
}) {
  const text = (page.description || page.tagline || "").trim();
  if (!text) return "";
  const sentence = text.split(/(?<=[.!?])\s+/)[0] || text;
  return sentence.length > 180 ? `${sentence.slice(0, 177).trim()}…` : sentence;
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
