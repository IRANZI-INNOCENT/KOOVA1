import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms — Kova",
  description: "The terms for using Kova to publish a store and run a business.",
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Terms">
      <LegalSection title="The service">
        <p>
          Kova helps a small business photograph a product, publish a public
          store, take the order on WhatsApp, and ask for posts, replies, and
          follow-up. These terms cover the website, the workspace, and the
          public store.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          You need an account to use the workspace. Give your own name and a
          real email address, and keep the password to yourself. You are
          responsible for activity under your account.
        </p>
      </LegalSection>

      <LegalSection title="Trial and price">
        <p>
          A new account includes a 7-day free trial of the workspace. After
          the trial, the plan is KSh 1,300 a month. You can cancel at any
          time. The price on the pricing section of the site is the price that
          applies when you subscribe.
        </p>
      </LegalSection>

      <LegalSection title="Your business and your store">
        <p>
          You own the photos, product details, and business information you
          add. You give Kova permission to host them, show them on your public
          store, and use them to draft listings, posts, and briefs for you.
        </p>
        <p>
          You are responsible for the price, the description, and any claim
          you publish. Check a draft before you rely on it. The AI usage page
          explains how those drafts are produced.
        </p>
      </LegalSection>

      <LegalSection title="Orders">
        <p>
          A customer orders by opening WhatsApp to the number you set. The
          sale is between you and that customer. Kova does not take the
          payment, hold the goods, or become the seller.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>
          Use Kova for a lawful business. Do not publish goods or claims you
          are not allowed to sell, attempt to break into another account, or
          use the service to mislead a customer.
        </p>
      </LegalSection>

      <LegalSection title="Availability">
        <p>
          We work to keep Kova available, and sometimes the service will be
          interrupted for a fix, a provider outage, or maintenance. Drafts can
          be wrong. Review them before they go to a customer.
        </p>
      </LegalSection>

      <LegalSection title="Ending use">
        <p>
          You can stop using Kova and cancel the plan. We can suspend an
          account that breaks these terms, puts other people at risk, or uses
          the service unlawfully. On closure, the public store can be taken
          down.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          Kova is a tool for your business. To the extent the law allows, Kova
          is not liable for lost sales, a customer dispute, or a decision you
          make from a draft. Nothing in these terms limits liability that
          Kenyan law does not allow us to limit.
        </p>
      </LegalSection>

      <LegalSection title="Law">
        <p>These terms are governed by the laws of Kenya.</p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If these terms change, the date at the top of the page changes with
          them. The updated terms apply from that date.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
