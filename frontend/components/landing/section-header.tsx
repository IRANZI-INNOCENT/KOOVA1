export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = "left",
  theme = "light",
  className = "",
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "left" | "center";
  theme?: "light" | "dark";
  className?: string;
}) {
  const alignClass = align === "center" ? "mx-auto text-center" : "max-w-2xl";
  const titleClass = theme === "dark" ? "text-white" : "text-kova-dark";
  const leadClass = theme === "dark" ? "text-white/75" : "text-kova-dark/68";
  const eyebrowClass =
    theme === "dark" ? "text-white/60" : "text-gray-500";

  return (
    <div className={`${alignClass} ${className}`}>
      {eyebrow ? (
        <p className={`text-sm font-medium ${eyebrowClass}`}>{eyebrow}</p>
      ) : null}
      <h2
        className={`font-display text-[1.75rem] font-semibold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.65rem] ${
          eyebrow ? "mt-2" : ""
        } ${titleClass}`}
      >
        {title}
      </h2>
      {lead ? (
        <p className={`mt-4 text-base leading-7 sm:text-[1.05rem] ${leadClass}`}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}
