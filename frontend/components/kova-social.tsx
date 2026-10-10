import { SectionHeader } from "@/components/landing/section-header";

const pillars = [
  {
    title: "Content studio",
    detail: "Draft posts from your catalog, approve what goes live, and schedule around your day.",
  },
  {
    title: "Inbox",
    detail: "Facebook and Instagram comments and DMs with a draft reply ready to send or save.",
  },
  {
    title: "Autopilot",
    detail: "Hand Kova the day — posts, replies, listing polish, and the morning report in one view.",
  },
];

export default function KovaSocial() {
  return (
    <section id="social" className="border-y border-kova-green/20 bg-[#125a42]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <SectionHeader
            theme="dark"
            eyebrow="Social workspace"
            title="Your pages stay active while you run the shop."
            lead="Kova drafts from your real products and policies, publishes when you allow it, and shows what performed so you know what to push next."
          />
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {pillars.map((item) => (
            <article
              key={item.title}
              className="rounded-lg border border-white/15 bg-white/[0.07] p-6 backdrop-blur-sm"
            >
              <h3 className="text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/70">{item.detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
          <div className="rounded-lg border border-white/15 bg-kova-dark/40 p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-kova-orange">
              Operating modes
            </p>
            <ul className="mt-6 space-y-4">
              {[
                { name: "Assist", text: "Kova suggests; you publish and send." },
                { name: "Approval", text: "Kova prepares; you approve each action." },
                { name: "Autopilot", text: "Kova runs the day within your rules and prices." },
              ].map((mode) => (
                <li key={mode.name} className="flex gap-4 border-b border-white/10 pb-4 last:border-0 last:pb-0">
                  <span className="w-20 shrink-0 text-sm font-bold text-[#a8dcc8]">{mode.name}</span>
                  <span className="text-sm leading-6 text-white/75">{mode.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-between rounded-lg bg-kova-orange/90 p-6 text-kova-dark">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-kova-dark/70">
                Talk to Kova
              </p>
              <p className="font-display mt-4 text-xl font-semibold leading-snug">
                Ask for the caption, the reply, or what to push next.
              </p>
            </div>
            <a
              href="/signup"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-kova-green px-5 text-sm font-semibold text-white transition-colors hover:bg-[#12583f]"
            >
              Open the workspace
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
