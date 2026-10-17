import Image from "next/image";

import { SectionHeader } from "@/components/landing/section-header";

const areas = [
  {
    label: "Morning overview",
    title: "Start the day knowing where things stand.",
    description:
      "Check your recent activity, see what needs a reply, and review the updates available for your business — without piecing everything together yourself.",
  },
  {
    label: "Leads and follow-ups",
    title: "Remember the customers who showed interest.",
    description:
      "Keep track of potential customers, the products they asked about, and the follow-ups you've recorded, so promising conversations are easier to pick up again.",
  },
  {
    label: "Performance",
    title: "See how your marketing is doing.",
    description:
      "Keep your content calendar, social activity, available performance data, and commerce page close at hand, helping you decide what to promote next.",
  },
];

const labels = [
  "Products & Store",
  "Social & Content",
  "Inbox",
  "Leads",
  "Orders",
  "Performance",
];

export default function OneWorkspaceSection() {
  return (
    <section className="border-t border-kova-border bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeader
          eyebrow="YOUR BUSINESS, IN ONE WORKSPACE"
          title="Know what's happening in your business without chasing everything down."
          lead="Your products are listed, your posts are going out, and customers are asking questions. KCOVA brings the work it supports into one workspace, so you can see what's happening and what needs your attention."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div className="relative min-h-[300px] overflow-hidden rounded-lg lg:min-h-full">
            <Image
              src="/landing/shop-owner.jpg"
              alt="Business owner reviewing their day in the shop"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 480px"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-kova-dark/65 via-kova-dark/15 to-transparent"
              aria-hidden
            />
          </div>

          <div>
            <div className="space-y-8">
              {areas.map((area) => (
                <article key={area.label}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-kova-orange">
                    {area.label}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-kova-dark">
                    {area.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-kova-dark/65">
                    {area.description}
                  </p>
                </article>
              ))}
            </div>

            <ul className="mt-10 flex flex-wrap gap-2">
              {labels.map((label) => (
                <li
                  key={label}
                  className="rounded-md border border-kova-border bg-kova-background px-3 py-2 text-xs font-semibold text-kova-dark/80"
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
