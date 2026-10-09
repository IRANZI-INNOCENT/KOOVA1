import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy — Kova",
  description: "How Kova handles account, business, product, and customer information.",
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Legal" title="Privacy policy">
      <LegalSection title="Who this covers">
        <p>
          This policy explains how Kova handles information when you create an
          account, run a business in the workspace, or open a public store.
          It is written for the Kenya Data Protection Act, 2019.
        </p>
        <p>
          Kova is the service. The business owner remains responsible for the
          customer information they choose to keep in Kova, including leads
          and WhatsApp conversations that continue outside Kova.
        </p>
      </LegalSection>

      <LegalSection title="Information we hold">
        <p>When you create an account, we hold your name, email address, and a password that is stored so it cannot be read back.</p>
        <p>
          When you set up a business, we hold the details you enter: the
          business name, description, industry, location, phone, email, and
          WhatsApp number, plus the Business Brain you write (profile,
          audience, brand, goals, and policies).
        </p>
        <p>
          When you sell, we hold product photos, names, prices, descriptions,
          and the public store page. When you use Talk to Kova, we hold the
          messages in that workspace and the drafts Kova prepares. When you
          record a lead, we hold the name, source, and notes you save.
        </p>
        <p>
          A public store shows the product and business details you publish.
          Anyone with the link can open that page.
        </p>
      </LegalSection>

      <LegalSection title="How we use it">
        <p>
          We use this information to run your account, publish the store,
          prepare listings and posts, keep leads, and write the morning brief
          from your own business records. We also use it to keep the service
          secure and to answer a request you send us.
        </p>
        <p>
          Product photos, business context, and the text you submit can be
          sent to the AI provider described on the AI usage page, so Kova can
          draft a listing, a post, a reply, or a brief. Market research uses
          publicly available web pages.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Sign-in uses one essential cookie, described on the cookies page.
          Kova does not set advertising or analytics cookies.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>
          We keep account and business information while the account is open.
          After you close the account, we keep what we still need for
          security, a dispute, or a legal duty, and then delete or de-identify
          the rest.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          You can review and edit your business, products, and policies in the
          workspace. You can ask to access, correct, or delete the personal
          information we hold about your account. Send that request from the
          email on your Kova account and put Privacy in the subject.
        </p>
        <p>
          If you store a customer’s details as a lead, you are the person they
          dealt with. Handle that information in line with your own duty to
          them.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          The sign-in refresh credential is stored in an HttpOnly cookie so
          page scripts cannot read it. The short-lived access token stays in
          memory for the session. Use a unique password and sign out on a
          shared device.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If this policy changes, the date at the top of the page changes with
          it. Continued use of Kova after that date means the updated policy
          applies.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
