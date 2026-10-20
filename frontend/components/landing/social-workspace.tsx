import { SectionHeader } from "@/components/landing/section-header";

const pillars = [
  {
    title: "Content Studio",
    description:
      "Prepare captions and product posts from your catalog, then review and schedule or publish.",
  },
  {
    title: "Inbox",
    description:
      "Comments and DMs from connected Facebook and Instagram accounts — draft replies, then send.",
  },
  {
    title: "Autopilot",
    description:
      "Hand off more routine work when you’re ready. Set rules so KCOVA knows what it can handle alone.",
  },
];

const modes = [
  {
    name: "Assist",
    description:
      "KCOVA prepares suggestions. You decide what to send or publish.",
    emphasis: "You decide",
  },
  {
    name: "Approval",
    description:
      "KCOVA prepares an action and waits for your approval before carrying it out.",
    emphasis: "You approve",
  },
  {
    name: "Autopilot",
    description:
      "KCOVA handles the tasks you’ve allowed, within your rules, and asks when needed.",
    emphasis: "KCOVA runs",
  },
];

export default function SocialWorkspaceSection() {
  return (
    <section id="social" className="scroll-mt-24 bg-kova-green">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <SectionHeader
            theme="dark"
            eyebrow="Social"
            title="Keep social media in order, even on busy days."
            lead="Products to promote, posts to prepare, customers waiting. See what’s ready, what needs you, and what to do next."
          />
        </div>

        <div className="mt-12 grid gap-px border border-white/15 bg-white/15 lg:grid-cols-3">
          {pillars.map((pillar) => (
            <article key={pillar.title} className="bg-[#125a42] p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-white">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/72">
                {pillar.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12">
          <p className="text-sm font-medium text-white/60">
            You decide how much KCOVA does
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {modes.map((mode) => (
              <article
                key={mode.name}
                className="border border-white/20 bg-kova-dark/20 p-6"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">
                    {mode.name}
                  </h3>
                  <span className="text-xs text-white/50">{mode.emphasis}</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-white/75">
                  {mode.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
