import type {
  ReactNode,
} from "react";

import { Logo } from "./logo";


/**
 * Shared layout for Kova authentication pages.
 *
 * Login and signup should feel like parts of the same product.
 * Keeping their layout here prevents visual differences from
 * appearing as the authentication experience grows.
 */
interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  footer?: ReactNode;
}


/**
 * Kova authentication layout.
 *
 * Desktop uses a two-column composition:
 *
 * - Left: Kova identity and product positioning.
 * - Right: The active authentication form.
 *
 * On smaller screens the identity panel becomes a compact
 * introduction above the form.
 */
export function AuthLayout({
  children,
  title,
  description,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-kova-background">

      <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">

        {/* Kova brand panel */}
        <section className="hidden bg-kova-green lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">

          <div>
            <Logo
              href="/"
              showTagline={false}
            />

            <div className="mt-24 max-w-md">

              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-kova-orange">
                AI social media + commerce
              </p>

              <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
                From content to customers.
              </h2>

              <p className="mt-6 max-w-sm text-base leading-7 text-white/80">
                Kova helps small businesses plan, create, publish,
                engage with customers, generate leads, and sell.
              </p>

            </div>
          </div>


          {/* Product capabilities */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-white/15 pt-8 xl:grid-cols-3">

            {[
              "Plan",
              "Create",
              "Publish",
              "Engage",
              "Sell",
              "Analyze",
            ].map((item) => (
              <div
                key={item}
                className="text-sm font-medium text-white/80"
              >
                {item}
              </div>
            ))}

          </div>

        </section>


        {/* Authentication panel */}
        <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10">

          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <div className="mb-12 lg:hidden">
              <Logo
                href="/"
                showTagline={true}
              />
            </div>


            <div>

              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">
                Kova
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
                {title}
              </h1>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                {description}
              </p>

            </div>


            <div className="mt-8">
              {children}
            </div>


            {footer && (
              <div className="mt-8 border-t border-kova-border pt-6 text-center text-sm text-gray-600">
                {footer}
              </div>
            )}

          </div>

        </section>

      </div>

    </main>
  );
}