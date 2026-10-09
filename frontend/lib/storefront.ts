export function whatsappLink(number: string, productName?: string) {
  const cleaned = number.replace(/\D/g, "");
  const text = productName
    ? `Hi, I want to order ${productName}. Is it available?`
    : "Hi, I want to place an order from your Kova store.";

  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

export function formatPrice(currency: string, price: string | null) {
  if (!price) return "Price on request";
  return `${currency} ${price}`;
}
