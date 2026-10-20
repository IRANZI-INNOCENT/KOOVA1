import Image from "next/image";

import { SectionHeader } from "@/components/landing/section-header";

const areas = [
  {
    label: "Morning overview",
    title: "Start the day knowing where things stand.",
    description:
      "Check recent activity, see what needs a reply, and review updates — without piecing everything together yourself.",
  },
  {
    label: "Leads and follow-ups",
    title: "Remember the customers who showed interest.",
    description:
      "Track potential customers, the products they asked about, and the follow-ups you’ve recorded.",
  },
  {
    label: "Performance",
    title: "See how your marketing is doing.",
    description:
      "Keep your calendar, social activity, and commerce page close at hand so you know what to promote next.",
  },
];

export default function OneWorkspaceSection() {
  return (
    <section className="border-t border-kova-border bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeader
          eyebrow="One workspace"
          title="Know what’s happening without chasing everything down."
          lead="Products listed, posts going out, customers asking questions. KCOVA brings the work into one place so you can see what needs attention."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div className="relative min-h-[300px] overflow-hidden lg:min-h-full">
            <Image
              src="/landing/shop-owner.jpg"
              alt="Business owner reviewing their day in the shop"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 480px"
            />
          </div>

          <div className="space-y-8">
            {areas.map((area) => (
              <article key={area.label}>
                <p className="text-sm font-medium text-gray-500">{area.label}</p>
                <h3 className="mt-1 text-lg font-semibold text-kova-dark">
                  {area.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-kova-dark/65">
                  {area.description}
                </p>
              </article>
            ))}
            <p className="text-sm text-gray-500">
              Products · Store · Social · Inbox · Leads · Orders · Reports
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
