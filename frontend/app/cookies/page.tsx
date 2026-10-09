import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Cookies — Kova",
  description: "The one cookie Kova uses to keep you signed in.",
};

export default function CookiesPage() {
  return (
    <LegalPage eyebrow="Legal" title="Cookies policy">
      <LegalSection title="What this covers">
        <p>
          A cookie is a small file the browser stores for a site. Kova uses
          one cookie, and it is there so you can stay signed in.
        </p>
      </LegalSection>

      <LegalSection title="The sign-in cookie">
        <p>
          Name: <span className="font-semibold text-kova-dark">kova_refresh_token</span>.
          It is set when you sign in and removed when you sign out.
        </p>
        <p>
          It holds the refresh credential for your session. The browser sends
          it back to Kova so a new short-lived access token can be issued. The
          cookie is HttpOnly, so scripts on the page cannot read it. It uses
          SameSite Lax and lasts 7 days. On a live HTTPS site it is also
          marked Secure.
        </p>
        <p>
          The access token itself is kept in memory for the open session. It
          is not stored in a cookie.
        </p>
      </LegalSection>

      <LegalSection title="Cookies we do not set">
        <p>
          Kova does not set advertising cookies, analytics cookies, or
          third-party tracking cookies. Because this cookie is required to
          keep you signed in, the site does not ask you to opt in to it.
        </p>
      </LegalSection>

      <LegalSection title="How to remove it">
        <p>
          Sign out, and Kova deletes the cookie. You can also remove it in
          your browser settings. If you remove it, you will need to sign in
          again.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
