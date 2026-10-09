"use client";

import { MessageDesk } from "@/components/workspace/message-desk";

export default function EngagementPage() {
  return (
    <div className="p-4 sm:p-8">
      <MessageDesk
        channels={["instagram", "facebook"]}
        title="Comments and messages"
        intro="Instagram and Facebook comments and direct messages. Kova drafts the reply, and Send posts it back on the connected account."
      />
    </div>
  );
}
