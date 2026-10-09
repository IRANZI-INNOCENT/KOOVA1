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
    <main className="min-h-dvh bg-kova-orange-soft">

      <div className="grid min-h-dvh lg:grid-cols-[0.92fr_1.08fr]">

        {/* Kova brand panel */}
        <section className="relative hidden overflow-hidden bg-kova-green lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          <img
            src="/landing/auth.jpg"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#176b4d]/84" />

          <div className="relative">
            <Logo
              href="/"
              showTagline={false}
              tone="light"
            />

            <div className="mt-24 max-w-md">

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-kova-orange">
                AI social media + commerce
              </p>

              <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
                From content to customers.
              </h2>

              <p className="mt-6 max-w-sm text-base leading-7 text-white/85">
                Kova helps small businesses plan, create, publish,
                engage with customers, generate leads, and sell.
              </p>

            </div>
          </div>


          {/* Product capabilities */}
          <div className="relative grid grid-cols-2 gap-x-8 gap-y-4 border-t border-white/20 pt-8 xl:grid-cols-3">

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
                className="text-sm font-medium text-white/90"
              >
                {item}
              </div>
            ))}

          </div>

        </section>


        {/* Authentication panel */}
        <section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-10">

          <div className="w-full max-w-md">

          <div className="mb-8 overflow-hidden rounded-lg lg:hidden">
            <div className="relative flex h-36 items-end px-5 py-4">
              <img
                src="/landing/auth.jpg"
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
              />
              <div className="absolute inset-0 bg-[#176b4d]/82" />
              <div className="relative">
                <Logo href="/" showTagline={false} tone="light" />
                <p className="mt-2 text-sm font-medium text-white/85">
                  From content to customers.
                </p>
              </div>
            </div>
          </div>

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
                Kova
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-kova-dark">
                {title}
              </h1>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {description}
              </p>

            </div>


            <div className="mt-8">
              {children}
            </div>


            {footer && (
              <div className="mt-8 border-t border-[#e8cbb4] pt-6 text-center text-sm text-gray-600">
                {footer}
              </div>
            )}

          </div>

        </section>

      </div>

    </main>
  );
}