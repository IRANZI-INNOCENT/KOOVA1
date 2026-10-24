export function whatsappLink(number: string, productName?: string) {
  const cleaned = number.replace(/\D/g, "");
  const text = productName
    ? `Hi, I want to order ${productName}. Is it available?`
    : "Hi, I want to place an order from your Kova store.";

  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

/** WhatsApp chat a customer opens when they order one listing. */
export function whatsappOrderLink(input: {
  number: string;
  productName: string;
  productUrl: string;
  imageUrl?: string;
  priceLabel?: string;
  service?: boolean;
}) {
  const cleaned = input.number.replace(/\D/g, "");
  const verb = input.service ? "book" : "order";
  const lines = [`Hi, I want to ${verb} ${input.productName}.`];
  if (input.priceLabel) lines.push(input.priceLabel);
  if (input.productUrl) {
    lines.push("", input.productUrl);
  }
  if (input.imageUrl) {
    lines.push(input.imageUrl);
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function formatPrice(currency: string, price: string | null) {
  if (!price) return "Price on request";
  return `${currency} ${price}`;
}
