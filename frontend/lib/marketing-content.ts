import { LOCAL_INTENT_PAGES } from "@/lib/local-intent";

export type MarketingGuide = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  updated: string;
  readMinutes: number;
  sections: { heading: string; body: string[] }[];
  ctaNote?: string;
};

export type IntentPage = {
  slug: string;
  path: string;
  title: string;
  description: string;
  h1: string;
  support: string;
  bullets: string[];
  sections: { heading: string; body: string[] }[];
};

export const INTENT_PAGES: IntentPage[] = [
  {
    slug: "whatsapp-shops",
    path: "/for/whatsapp-shops",
    title: "WhatsApp shop for Kenyan businesses",
    description:
      "Share products, collect orders on WhatsApp, and keep listings ready without building a separate website. Built for small shops in Kenya.",
    h1: "A WhatsApp-ready shop for businesses that sell every day",
    support:
      "Customers already message you on WhatsApp. KCOVA gives them a clear product page to browse first — then sends them back to you to order.",
    bullets: [
      "One commerce page for all active products",
      "Share a product link in WhatsApp chats and statuses",
      "Prices and photos stay under your control",
      "Works alongside Facebook and Instagram posting",
    ],
    sections: [
      {
        heading: "Why WhatsApp-first shops win in Kenya",
        body: [
          "Many buyers discover products on Instagram or Facebook, then finish the conversation on WhatsApp. A clean product link reduces back-and-forth photos and wrong prices.",
          "KCOVA helps you publish a public store page, polish listings from phone photos, and keep social posts pointing at the same product URL.",
        ],
      },
      {
        heading: "What you can do",
        body: [
          "Snap product photos into a draft listing, set your KES price, and publish when ready.",
          "Share the store or a single product. Customers browse, then tap through to WhatsApp to order with you.",
          "Use Autopilot and content tools when you want help posting — without inventing stock or prices you did not enter.",
        ],
      },
    ],
  },
  {
    slug: "instagram-sellers",
    path: "/for/instagram-sellers",
    title: "Instagram selling tools for small shops",
    description:
      "Turn Instagram attention into product links and WhatsApp orders. Manage posts and a simple store from one KCOVA workspace.",
    h1: "Sell from Instagram without losing the order in DMs",
    support:
      "Posting is only half the job. KCOVA connects your catalog, captions, and WhatsApp path so interested buyers know what is for sale and how to order.",
    bullets: [
      "Draft posts and carousels from real product facts",
      "Link captions to your public product pages",
      "Keep Facebook Page and Instagram work in one place",
      "Guide buyers to WhatsApp when they are ready",
    ],
    sections: [
      {
        heading: "From scroll to order",
        body: [
          "Beautiful posts still fail when the caption has no clear next step. KCOVA helps you attach the product page customers can open, then continue on WhatsApp.",
          "When a product has multiple photos, you can publish a real multi-image post instead of a fake “swipe through” caption on a single photo.",
        ],
      },
      {
        heading: "Built for owners, not agencies",
        body: [
          "You do not need a separate website team. Connect the accounts you use, prepare products once, and reuse them across social and WhatsApp.",
          "Stay in control: review drafts, set prices yourself, and choose what Autopilot is allowed to publish.",
        ],
      },
    ],
  },
];

export const GUIDES: MarketingGuide[] = [
  {
    slug: "sell-on-whatsapp-kenya",
    title: "How to sell on WhatsApp in Kenya (without a full website)",
    description:
      "A practical setup for Kenyan shops: product photos, clear prices in KES, a shareable catalog link, and WhatsApp as the order channel.",
    eyebrow: "WhatsApp commerce",
    updated: "2026-10-18",
    readMinutes: 6,
    sections: [
      {
        heading: "Start with products customers can open",
        body: [
          "Save each item with a name, price, and at least one clear photo. Ambiguous listings create more chat — and more wrong orders.",
          "A public product page lets you send one link instead of resending images in every conversation.",
        ],
      },
      {
        heading: "Use WhatsApp for closing, not for browsing",
        body: [
          "Let people browse the catalog first. When they tap order, continue the conversation on WhatsApp where trust and payment details already live for many Kenyan buyers.",
          "Keep your WhatsApp number on the store page so the handoff is obvious.",
        ],
      },
      {
        heading: "Keep social and WhatsApp aligned",
        body: [
          "When you post on Instagram or Facebook, point to the same product URL. That way every channel reinforces one source of truth for price and photos.",
          "KCOVA is built for this loop: listings, posts, and WhatsApp-ready links in one workspace.",
        ],
      },
    ],
    ctaNote: "Create your store page and share your first product link today.",
  },
  {
    slug: "instagram-to-whatsapp-orders",
    title: "Turn Instagram interest into WhatsApp orders",
    description:
      "Simple habits for fashion and campus sellers: clearer posts, product links in captions, and a calm path from DM interest to WhatsApp checkout.",
    eyebrow: "Instagram selling",
    updated: "2026-10-18",
    readMinutes: 5,
    sections: [
      {
        heading: "Make the offer obvious in the first lines",
        body: [
          "Lead with what the item is, who it is for, and the price once — not three times. Busy scrollers decide in seconds.",
          "If you show multiple colors, use real multi-image posts when you have the photos, instead of telling people to swipe when they cannot.",
        ],
      },
      {
        heading: "Put the next step in the caption",
        body: [
          "Link the product page so serious buyers can confirm details before messaging you.",
          "Invite them to WhatsApp to order. That keeps negotiation and delivery details in a channel your customers already use.",
        ],
      },
      {
        heading: "Reuse one catalog everywhere",
        body: [
          "The same listing should power Instagram, Facebook, and WhatsApp shares. Updating the price once should update what customers see.",
          "KCOVA keeps that catalog in one place so you are not rewriting the same product for every app.",
        ],
      },
    ],
  },
  {
    slug: "product-photos-to-listings",
    title: "From phone photos to a sellable product listing",
    description:
      "How Snap to Sell style workflows help you turn everyday product photos into titles, descriptions, and SEO-ready listings you can share.",
    eyebrow: "Snap to Sell",
    updated: "2026-10-18",
    readMinutes: 5,
    sections: [
      {
        heading: "Photograph for clarity, not perfection",
        body: [
          "Natural light, a simple background, and one hero angle beat a cluttered montage. Add a second photo for color or detail when you have it.",
          "Good inputs produce better titles, alt text, and customer-facing descriptions.",
        ],
      },
      {
        heading: "Confirm price and facts yourself",
        body: [
          "AI can draft wording from what it sees. You still set the KES price, stock expectations, and anything the photo cannot prove.",
          "Never publish a discount or award the system invented. Customers remember wrong prices longer than pretty captions.",
        ],
      },
      {
        heading: "Publish where buyers will land",
        body: [
          "Once the listing is solid, put it on your public store page and reuse the URL in posts and WhatsApp replies.",
          "Search engines and link previews work better when that page is real HTML with a clear title and description — not an empty app shell.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string): MarketingGuide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function allIntentPages(): IntentPage[] {
  return [...INTENT_PAGES, ...(LOCAL_INTENT_PAGES as IntentPage[])];
}

export function getIntentPage(slug: string): IntentPage | undefined {
  return allIntentPages().find((p) => p.slug === slug);
}

/** Paths included in sitemap (marketing content). */
export function marketingContentPaths(): string[] {
  return [
    ...allIntentPages().map((p) => p.path),
    "/guides",
    ...GUIDES.map((g) => `/guides/${g.slug}`),
  ];
}
