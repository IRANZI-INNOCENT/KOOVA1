import { SectionHeader } from "@/components/landing/section-header";

const pillars = [
  {
    title: "Content Studio",
    description:
      "Need something to post? Prepare captions and product posts from your catalog, then review them and schedule or publish them using the options available to you.",
  },
  {
    title: "Inbox",
    description:
      "Keep up with comments and direct messages from your connected Facebook and Instagram accounts. Get help preparing replies and decide what to send.",
  },
  {
    title: "Autopilot",
    description:
      "Let KCOVA take care of more of the routine work when you're ready. Set your rules and permissions so it knows what it can handle and when it needs you.",
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
      "KCOVA handles the tasks you've allowed it to do, within your rules, and asks for your input when needed.",
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
            eyebrow="YOUR SOCIAL WORKSPACE"
            title="Keep your social media in order, even on your busiest days."
            lead="There are products to promote, posts to prepare and customers waiting for replies. KCOVA brings that work together so you can see what's ready, what needs your attention, and what to do next."
          />
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-white/15 bg-white/15 lg:grid-cols-3">
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
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-kova-orange">
            YOU DECIDE HOW MUCH KCOVA DOES
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {modes.map((mode, index) => (
              <article
                key={mode.name}
                className={
                  index === 2
                    ? "rounded-lg border border-kova-orange/50 bg-kova-orange/15 p-6"
                    : index === 1
                      ? "rounded-lg border border-white/25 bg-white/10 p-6"
                      : "rounded-lg border border-white/15 bg-kova-dark/25 p-6"
                }
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">
                    {mode.name}
                  </h3>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
                      index === 2 ? "text-kova-orange" : "text-white/45"
                    }`}
                  >
                    {mode.emphasis}
                  </span>
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
