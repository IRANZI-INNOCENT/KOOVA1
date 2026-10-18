/** Mirrors IntentPage in marketing-content (kept local to avoid circular imports). */
export type LocalIntentPage = {
  slug: string;
  path: string;
  title: string;
  description: string;
  h1: string;
  support: string;
  bullets: string[];
  sections: { heading: string; body: string[] }[];
};

type LocalSeed = {
  slug: string;
  place: string;
  kind: "city" | "industry" | "audience";
  title: string;
  description: string;
  h1: string;
  support: string;
  focus: string[];
};

/**
 * Substantive local / industry pages — not thin doorway spam.
 * Each page has unique place + selling context for Kenya / EA.
 */
const SEEDS: LocalSeed[] = [
  {
    slug: "nairobi-shops",
    place: "Nairobi",
    kind: "city",
    title: "Online shop tools for Nairobi businesses",
    description:
      "List products, post on Instagram and Facebook, and take WhatsApp orders — built for Nairobi sellers who need one workspace.",
    h1: "Sell across Nairobi without juggling five apps",
    support:
      "From Westlands pop-ups to CBD wholesale and estate deliveries, KCOVA keeps your catalog, posts, and WhatsApp path in one place.",
    focus: [
      "Share product links customers in Nairobi can open instantly",
      "Keep KES prices consistent across social and WhatsApp",
      "Post for Instagram and Facebook from the same product facts",
    ],
  },
  {
    slug: "mombasa-shops",
    place: "Mombasa",
    kind: "city",
    title: "WhatsApp and social selling for Mombasa shops",
    description:
      "A simple store page and social workspace for Mombasa businesses that sell on WhatsApp, Instagram, and Facebook.",
    h1: "A clearer shop front for Mombasa sellers",
    support:
      "Coast customers often discover on social, then message on WhatsApp. Give them a real product page before the chat starts.",
    focus: [
      "Publish a public catalog with photos and prices",
      "Hand buyers to WhatsApp when they are ready to order",
      "Reuse one listing across posts and chats",
    ],
  },
  {
    slug: "fashion-kenya",
    place: "Kenya",
    kind: "industry",
    title: "Fashion selling tools for Kenyan brands",
    description:
      "Turn phone photos into listings, show colors properly, and guide buyers from Instagram to WhatsApp orders.",
    h1: "Fashion listings that match what you actually sell",
    support:
      "Color variants, clear prices, and real multi-image posts matter for dresses, bags, and accessories. KCOVA is built for that catalog work.",
    focus: [
      "Snap photos into structured product drafts",
      "Publish carousels when you have multiple product photos",
      "Link every post back to the product page",
    ],
  },
  {
    slug: "beauty-kenya",
    place: "Kenya",
    kind: "industry",
    title: "Beauty and cosmetics shops on WhatsApp",
    description:
      "Organize skincare and beauty products, share trustworthy listings, and take orders on WhatsApp with KCOVA.",
    h1: "Beauty products, clear listings, WhatsApp orders",
    support:
      "Customers want ingredients, shades, and price before they message. A public product page reduces confusion in the chat.",
    focus: [
      "Keep shade, size, and price facts on the listing",
      "Share one link instead of resending photos",
      "Post updates without inventing stock claims",
    ],
  },
  {
    slug: "campus-sellers",
    place: "Kenya campuses",
    kind: "audience",
    title: "Campus sellers: Instagram to WhatsApp in one flow",
    description:
      "For student and campus fashion sellers who post daily and close on WhatsApp — catalog, captions, and order links together.",
    h1: "Campus selling without the DM chaos",
    support:
      "Fast trends need fast listings. KCOVA helps you publish a product, post it, and send buyers to WhatsApp without rebuilding the caption every time.",
    focus: [
      "List drops quickly from phone photos",
      "Keep campus-friendly prices visible once",
      "Point Instagram interest at a real product URL",
    ],
  },
];

function buildLocalIntent(seed: LocalSeed): LocalIntentPage {
  return {
    slug: seed.slug,
    path: `/for/${seed.slug}`,
    title: seed.title,
    description: seed.description,
    h1: seed.h1,
    support: seed.support,
    bullets: seed.focus,
    sections: [
      {
        heading: `Why this matters in ${seed.place}`,
        body: [
          `Buyers around ${seed.place} already use Instagram, Facebook, and WhatsApp. The shops that win make the offer obvious before the chat gets messy.`,
          "KCOVA gives you a public store page for browsing and keeps social posts attached to the same product facts you control.",
        ],
      },
      {
        heading: "What to set up first",
        body: [
          "Add a few active products with clear photos and KES prices.",
          "Publish your store page, then share one product link in a WhatsApp status or Instagram caption.",
          "Connect Facebook or Instagram when you are ready for assisted posting — Autopilot only does what you allow.",
        ],
      },
    ],
  };
}

export const LOCAL_INTENT_PAGES: LocalIntentPage[] = SEEDS.map(buildLocalIntent);

export function getLocalIntentPage(slug: string): LocalIntentPage | undefined {
  return LOCAL_INTENT_PAGES.find((p) => p.slug === slug);
}
