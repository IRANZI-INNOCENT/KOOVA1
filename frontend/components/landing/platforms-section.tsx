import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "@/components/landing/social-icons";

const platforms = [
  {
    name: "Facebook",
    eyebrow: "Facebook via KCOVA",
    Icon: FacebookIcon,
    iconClass: "text-[#1877F2]",
    points: [
      {
        title: "Establish your online presence.",
        description:
          "Connect your Facebook Page in KCOVA and keep your business details ready. KCOVA uses that information when preparing posts and customer replies that fit your business.",
      },
      {
        title: "Stay connected with customers.",
        description:
          "In KCOVA, prepare photos and product updates as posts, then review them and publish or schedule using the options available to you — so your page keeps moving even on busy days.",
      },
      {
        title: "Showcase products and services.",
        description:
          "Use KCOVA to share listings from your catalog so people can see what you sell, open your commerce page, and continue their order with you on WhatsApp.",
      },
    ],
  },
  {
    name: "Instagram",
    eyebrow: "Instagram via KCOVA",
    Icon: InstagramIcon,
    iconClass: "",
    points: [
      {
        title: "Showcase your brand.",
        description:
          "Instagram is visual — in KCOVA, prepare product posts from your catalog with captions that match your business, then review them before they go out.",
      },
      {
        title: "Engage with your community.",
        description:
          "Keep up with Instagram comments and direct messages in your KCOVA inbox. Get help preparing replies, then decide what to send.",
      },
      {
        title: "Get discovered.",
        description:
          "From KCOVA, share product pages and your commerce page so people who aren't already following you can find what you sell and reach you on WhatsApp.",
      },
    ],
  },
  {
    name: "WhatsApp",
    eyebrow: "WhatsApp via KCOVA",
    Icon: WhatsAppIcon,
    iconClass: "text-[#25D366]",
    points: [
      {
        title: "Keep conversations moving.",
        description:
          "When customers ask about a product, KCOVA helps you prepare replies using your prices and product details — so buying questions don't get lost before they continue on WhatsApp.",
      },
      {
        title: "Set clear expectations.",
        description:
          "Choose how much KCOVA can draft or handle for you. You stay in control of approvals and what actually goes out to customers.",
      },
      {
        title: "Answer common questions faster.",
        description:
          "KCOVA uses your catalog so replies about availability, prices, and products stay accurate. Customers continue the order with you on WhatsApp.",
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
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-kova-orange">
            KCOVA ON YOUR CHANNELS
          </p>
          <h2
            id="platforms-heading"
            className="font-display mt-4 text-[1.75rem] font-semibold leading-[1.12] tracking-tight text-kova-dark sm:text-4xl lg:text-[2.65rem]"
          >
            Use Facebook, Instagram, and WhatsApp through KCOVA.
          </h2>
          <p className="mt-4 text-base leading-7 text-kova-dark/68 sm:text-[1.05rem]">
            Your customers are already on these channels. KCOVA helps you prepare
            the posts, keep up with enquiries, and guide buyers to WhatsApp —
            without juggling every app yourself.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-3 lg:gap-8">
          {platforms.map((platform) => (
            <article
              key={platform.name}
              className="border-t border-kova-border pt-8 lg:border-t-0 lg:border-l lg:border-kova-border lg:pl-8 lg:pt-0 first:lg:border-l-0 first:lg:pl-0"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-kova-background ring-1 ring-kova-border">
                  <platform.Icon
                    className={`h-5 w-5 ${platform.iconClass}`}
                    {...(platform.name === "Instagram"
                      ? { gradientId: "ig-platforms" }
                      : {})}
                  />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-kova-green">
                    {platform.eyebrow}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-kova-dark">
                    {platform.name}
                  </h3>
                </div>
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
