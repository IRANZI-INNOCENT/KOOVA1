import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "@/components/landing/social-icons";

const platforms = [
  {
    name: "Facebook",
    Icon: FacebookIcon,
    iconClass: "text-[#1877F2]",
    points: [
      {
        title: "Establish your online presence.",
        description:
          "Connect your Facebook Page and keep your business details ready. KCOVA uses that when preparing posts and replies.",
      },
      {
        title: "Stay connected with customers.",
        description:
          "Prepare photos and product updates as posts, then review, publish, or schedule — so your page keeps moving on busy days.",
      },
      {
        title: "Showcase products and services.",
        description:
          "Share listings from your catalog so people can see what you sell, open your store, and continue on WhatsApp.",
      },
    ],
  },
  {
    name: "Instagram",
    Icon: InstagramIcon,
    iconClass: "",
    points: [
      {
        title: "Showcase your brand.",
        description:
          "Prepare product posts from your catalog with captions that match your business, then review before they go out.",
      },
      {
        title: "Engage with your community.",
        description:
          "Comments and DMs land in your KCOVA inbox. Get help drafting replies, then decide what to send.",
      },
      {
        title: "Get discovered.",
        description:
          "Share product and store links so people who aren’t following yet can find what you sell and reach you on WhatsApp.",
      },
    ],
  },
  {
    name: "WhatsApp",
    Icon: WhatsAppIcon,
    iconClass: "text-[#25D366]",
    points: [
      {
        title: "Keep conversations moving.",
        description:
          "When customers ask about a product, KCOVA helps prepare replies using your prices and details.",
      },
      {
        title: "Set clear expectations.",
        description:
          "Choose how much KCOVA can draft. You stay in control of approvals and what goes out.",
      },
      {
        title: "Answer common questions faster.",
        description:
          "Replies about availability and prices stay accurate from your catalog. Orders continue with you on WhatsApp.",
      },
    ],
  },
];

export default function PlatformsSection() {
  return (
    <section
      id="platforms"
      className="border-t border-kova-border bg-white"
      aria-labelledby="platforms-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-gray-500">Manage</p>
          <h2
            id="platforms-heading"
            className="font-display mt-2 text-[1.75rem] font-semibold leading-[1.12] tracking-tight text-kova-dark sm:text-4xl lg:text-[2.65rem]"
          >
            Facebook, Instagram, and WhatsApp through KCOVA.
          </h2>
          <p className="mt-4 text-base leading-7 text-kova-dark/68 sm:text-[1.05rem]">
            Prepare posts, keep up with enquiries, and guide buyers to WhatsApp —
            without juggling every app yourself.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-3 lg:gap-8">
          {platforms.map((platform) => (
            <article
              key={platform.name}
              className="border-t border-kova-border pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0 lg:first:border-l-0 lg:first:pl-0"
            >
              <div className="flex items-center gap-3">
                <platform.Icon
                  className={`h-6 w-6 ${platform.iconClass}`}
                  {...(platform.name === "Instagram"
                    ? { gradientId: "ig-platforms" }
                    : {})}
                />
                <h3 className="text-lg font-semibold text-kova-dark">
                  {platform.name}
                </h3>
              </div>

              <ul className="mt-7 space-y-6">
                {platform.points.map((point) => (
                  <li key={point.title}>
                    <p className="text-sm font-semibold text-kova-dark">
                      {point.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-kova-dark/65">
                      {point.description}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
