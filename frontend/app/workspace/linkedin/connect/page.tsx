"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import { useAuth } from "@/lib/auth-context";
import {
  disconnectLinkedIn,
  getLinkedInOAuthUrl,
  getProfessionalProfile,
  type ProfessionalProfile,
} from "@/lib/professional";

function ConnectContent() {
  const { accessToken } = useAuth();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectUri, setRedirectUri] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    getProfessionalProfile(accessToken).then(setProfile);
    getLinkedInOAuthUrl(accessToken)
      .then((data) => setRedirectUri(data.redirect_uri ?? ""))
      .catch(() => setRedirectUri(""));
  }, [accessToken]);

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      setMessage("LinkedIn connected.");
    }
    const err = searchParams.get("error");
    if (err) {
      setMessage(`Connection issue: ${err}`);
    }
  }, [searchParams]);

  async function connect() {
    if (!accessToken) return;
    setLoading(true);
    try {
      const { url } = await getLinkedInOAuthUrl(accessToken);
      window.location.href = url;
    } catch {
      setMessage(
        "LinkedIn OAuth is not configured on the server. Use Copy to publish posts manually.",
      );
      setLoading(false);
    }
  }

  async function disconnect() {
    if (!accessToken) return;
    await disconnectLinkedIn(accessToken);
    setProfile(await getProfessionalProfile(accessToken));
    setMessage("Disconnected.");
  }

  const linkedin = profile?.linkedin;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Connect LinkedIn</h1>
      <p className="mt-2 text-sm text-kova-muted">
        Optional for v1: you can always copy drafts into LinkedIn. When OAuth
        is configured, Kova can publish text posts and run your schedule.
      </p>

      {message && (
        <p className="mt-4 rounded-lg bg-kova-cream px-3 py-2 text-sm">{message}</p>
      )}

      <div className="mt-6 rounded-xl border border-kova-border bg-white p-5">
        <p className="text-sm">
          Status:{" "}
          <span className="font-medium capitalize">
            {linkedin?.connection_status ?? "disconnected"}
          </span>
        </p>
        {linkedin?.display_name && (
          <p className="mt-1 text-sm text-kova-muted">{linkedin.display_name}</p>
        )}
        {!linkedin?.configured && (
          <p className="mt-3 text-sm text-amber-700">
            Server env LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are not set
            yet.
          </p>
        )}
        {redirectUri && (
          <div className="mt-4 rounded-lg bg-kova-cream/80 px-3 py-2 text-xs text-kova-ink">
            <p className="font-semibold">LinkedIn redirect URL (must match exactly)</p>
            <p className="mt-1 break-all font-mono">{redirectUri}</p>
            <p className="mt-2 text-kova-muted">
              Paste this under your LinkedIn app → Auth → Authorized redirect
              URLs for OAuth 2.0.
            </p>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          <Button type="button" disabled={loading} onClick={connect}>
            Connect LinkedIn
          </Button>
          <Button type="button" variant="outline" onClick={disconnect}>
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LinkedInConnectPage() {
  return (
    <WorkspacePageFrame>
      <Suspense
        fallback={
          <div className="p-8 text-sm text-kova-muted">Loading…</div>
        }
      >
        <ConnectContent />
      </Suspense>
    </WorkspacePageFrame>
  );
}
