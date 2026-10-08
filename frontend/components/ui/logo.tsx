import Link from "next/link";


/**
 * Kova logo component.
 *
 * The logo is intentionally text-first at this stage. The visual
 * identity can later be extended with the finalized Kova symbol
 * without changing every page that uses the logo.
 */
interface LogoProps {
  href?: string;
  showTagline?: boolean;
}


export function Logo({
  href = "/",
  showTagline = false,
}: LogoProps) {
  const content = (
    <div className="inline-flex flex-col">

      <span className="text-xl font-bold tracking-[-0.03em] text-kova-dark">
        Kova<span className="text-kova-green">.</span>
      </span>

      {showTagline && (
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-gray-500">
          From content to commerce
        </span>
      )}

    </div>
  );


  return (
    <Link
      href={href}
      aria-label="Kova home"
      className="inline-flex"
    >
      {content}
    </Link>
  );
}