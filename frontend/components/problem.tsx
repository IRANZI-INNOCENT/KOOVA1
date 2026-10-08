export default function Problem() {
  const problems = [
    {
      number: "01",
      title: "Creating content",
      description:
        "You know you should post consistently, but coming up with what to say takes time.",
    },
    {
      number: "02",
      title: "Managing conversations",
      description:
        "Customer questions, comments, and DMs keep coming while you're busy running the business.",
    },
    {
      number: "03",
      title: "Following up",
      description:
        "Potential customers get lost when leads are not tracked and followed up at the right time.",
    },
    {
      number: "04",
      title: "Turning attention into sales",
      description:
        "Likes and views are useful, but your business ultimately needs conversations, customers, and revenue.",
    },
  ];

  return (
    <section className="border-t border-kova-border bg-kova-white">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-kova-green">
            The problem
          </p>

          <h2 className="mt-5 text-4xl font-bold tracking-tight text-kova-dark sm:text-5xl">
            Running a business shouldn't mean becoming a full-time social
            media manager.
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-kova-dark/65">
            Social media can bring customers to your business, but managing
            everything around it can quickly become another full-time job.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-kova-border bg-kova-border md:grid-cols-2">
          {problems.map((problem) => (
            <div
              key={problem.number}
              className="bg-kova-white p-8 lg:p-10"
            >
              <span className="text-sm font-semibold text-kova-orange">
                {problem.number}
              </span>

              <h3 className="mt-5 text-xl font-semibold text-kova-dark">
                {problem.title}
              </h3>

              <p className="mt-3 max-w-md text-sm leading-6 text-kova-dark/60">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}