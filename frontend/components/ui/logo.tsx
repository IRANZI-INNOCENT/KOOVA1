import Link from "next/link";


/**
 * KCOVA logo component.
 *
 * The logo is intentionally text-first at this stage. The visual
 * identity can later be extended with the finalized brand symbol
 * without changing every page that uses the logo.
 */
interface LogoProps {
  href?: string;
  showTagline?: boolean;
  tone?: "dark" | "light";
}


export function Logo({
  href = "/",
  showTagline = false,
  tone = "dark",
}: LogoProps) {
  const content = (
    <div className="inline-flex flex-col">

      <span className={`text-xl font-bold tracking-[-0.03em] ${tone === "light" ? "text-white" : "text-kova-dark"}`}>
        KCOVA<span className={tone === "light" ? "text-kova-orange" : "text-kova-green"}>.</span>
      </span>

      {showTagline && (
        <span className="mt-0.5 text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
          From content to commerce
        </span>
      )}

    </div>
  );


  return (
    <Link
      href={href}
      aria-label="KCOVA home"
      className="inline-flex"
    >
      {content}
    </Link>
  );
}