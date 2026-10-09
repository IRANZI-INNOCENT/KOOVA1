import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "AI usage — Kova",
  description: "How Kova uses AI, what you should review, and what stays in your control.",
};

export default function AiUsagePage() {
  return (
    <LegalPage eyebrow="Legal" title="AI usage">
      <LegalSection title="What Kova uses AI for">
        <p>
          Kova uses a language model to draft work for your business. That
          includes a product listing from a photo, a social post, a reply, a
          lead note, a market brief from public pages, and the daily morning
          brief from your own records.
        </p>
      </LegalSection>

      <LegalSection title="What is sent">
        <p>
          A request can include the business context you saved, the product
          photo and details, the instruction you typed, and the records needed
          for that draft. Those materials are sent to Kova’s model provider
          so the draft can be written.
        </p>
        <p>
          Kova does not train its own model on your content. The provider
          processes the request to return the draft. Payment card numbers are
          not part of Kova: orders continue on WhatsApp with you.
        </p>
      </LegalSection>

      <LegalSection title="Review before it goes live">
        <p>
          A draft can be incomplete or wrong. Read the listing, the price, and
          the post before a customer relies on them. You can edit anything
          Kova prepares.
        </p>
        <p>
          Your business policy sets what Kova may do on its own and what waits
          for your approval. Autopilot still follows that policy. You remain
          responsible for what is published in your name.
        </p>
      </LegalSection>

      <LegalSection title="Morning brief and market research">
        <p>
          The morning brief is written from counts and records already in your
          workspace, such as products, content, and leads. Where a number is
          missing, the brief should say so.
        </p>
        <p>
          Market position searches public pages for similar sellers and writes
          a brief you can keep or leave unused. It is a reading of public
          information, not a guarantee about a competitor.
        </p>
      </LegalSection>

      <LegalSection title="Your control">
        <p>
          You choose the business facts Kova works from, you can change the
          operating mode, and you can ignore or rewrite a draft. The privacy
          policy explains the account and business information held alongside
          these drafts.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
