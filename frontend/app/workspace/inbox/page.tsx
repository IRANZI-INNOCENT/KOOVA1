"use client";

import { AppShell } from "@/components/workspace/app-shell";
import { MessageDesk } from "@/components/workspace/message-desk";

export default function InboxPage() {
  return (
    <AppShell>
      <div className="p-4 sm:p-8">
        <MessageDesk
          title="Inbox"
          intro="Comments and direct messages from Instagram, Facebook, and WhatsApp. Kova reads each one and drafts the reply. Likes are counted on Performance, not here."
        />
      </div>
    </AppShell>
  );
}
