"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/workspace/page-skeleton";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  getLinkedInOAuthUrl,
  getProfessionalProfile,
  listProfessionalPosts,
  type ProfessionalPost,
  type ProfessionalProfile,
} from "@/lib/professional";

export default function LinkedInHomePage() {
  const { accessToken } = useAuth();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [posts, setPosts] = useState<ProfessionalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectMessage, setConnectMessage] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    Promise.all([
      getProfessionalProfile(accessToken),
      listProfessionalPosts(accessToken),
    ])
      .then(([prof, postList]) => {
        setProfile(prof);
        setPosts(postList.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  const linkedin = profile?.linkedin;
  const isConnected = linkedin?.connection_status === "connected";

  async function connectLinkedIn() {
    if (!accessToken) return;
    setConnectMessage("");
    setConnecting(true);
    try {
      const { url } = await getLinkedInOAuthUrl(accessToken);
      window.location.href = url;
    } catch (err) {
      setConnectMessage(
        err instanceof ApiError
          ? err.message
          : "LinkedIn OAuth is not configured on the server. You can still copy drafts into LinkedIn.",
      );
      setConnecting(false);
    }
  }

  if (loading) {
    return (
      <WorkspacePageFrame>
        <PageSkeleton />
      </WorkspacePageFrame>
    );
  }

  return (
    <WorkspacePageFrame>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-kova-ink">
            LinkedIn workspace
          </h1>
          <p className="mt-1 text-sm text-kova-muted">
            {profile?.headline ||
              "Set up your profile and pillars, then run a topic week or capture an event."}
          </p>
          <p className="mt-2 text-xs text-kova-muted">
            Mode:{" "}
            <span className="font-medium capitalize">
              {profile?.operating_mode ?? "approval"}
            </span>
          </p>
        </div>

        <div
          className={`rounded-xl border p-4 sm:p-5 ${
            isConnected
              ? "border-kova-green/30 bg-kova-green/5"
              : "border-kova-orange/40 bg-kova-orange/5"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-kova-ink">
                {isConnected ? "LinkedIn connected" : "Connect your LinkedIn"}
              </p>
              <p className="mt-1 text-sm text-kova-muted">
                {isConnected
                  ? linkedin?.display_name
                    ? `Posting as ${linkedin.display_name}. Kova can publish and schedule text posts for you.`
                    : "Kova can publish and schedule text posts for you."
                  : "Link your account so Kova can publish and schedule posts—not just copy drafts."}
              </p>
              {connectMessage && (
                <p className="mt-2 text-sm text-amber-800">{connectMessage}</p>
              )}
              {!linkedin?.configured && !isConnected && (
                <p className="mt-2 text-xs text-amber-800">
                  Server needs LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET. Until
                  then, use{" "}
                  <Link
                    href="/workspace/linkedin/connect"
                    className="font-medium underline"
                  >
                    Connect
                  </Link>{" "}
                  or copy posts manually.
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {isConnected ? (
                <Link
                  href="/workspace/linkedin/connect"
                  className="inline-flex h-10 items-center rounded-md border border-kova-border bg-white px-4 text-sm font-semibold text-kova-ink hover:border-kova-green/40"
                >
                  Manage connection
                </Link>
              ) : (
                <>
                  <Button
                    type="button"
                    disabled={connecting}
                    onClick={connectLinkedIn}
                  >
                    {connecting ? "Opening LinkedIn…" : "Connect LinkedIn"}
                  </Button>
                  <Link
                    href="/workspace/linkedin/connect"
                    className="inline-flex h-10 items-center rounded-md border border-kova-border bg-white px-4 text-sm font-semibold text-kova-ink hover:border-kova-green/40"
                  >
                    Details
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/workspace/linkedin/topic-week"
            className="rounded-xl border border-kova-border bg-white p-4 shadow-sm hover:border-kova-green/40"
          >
            <h2 className="font-semibold">Topic week</h2>
            <p className="mt-1 text-sm text-kova-muted">
              Plan three posts around one theme for the week.
            </p>
          </Link>
          <Link
            href="/workspace/linkedin/event"
            className="rounded-xl border border-kova-border bg-white p-4 shadow-sm hover:border-kova-green/40"
          >
            <h2 className="font-semibold">Event moment</h2>
            <p className="mt-1 text-sm text-kova-muted">
              Upload a photo, answer one question, get a post arc.
            </p>
          </Link>
        </div>

        <section>
          <h2 className="text-lg font-semibold">Recent posts</h2>
          {posts.length === 0 ? (
            <p className="mt-2 text-sm text-kova-muted">
              No drafts yet. Start a program above.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="rounded-lg border border-kova-border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{post.title || "Untitled"}</span>
                  <span className="ml-2 capitalize text-kova-muted">
                    {post.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/workspace/linkedin/calendar"
            className="mt-3 inline-block text-sm font-medium text-kova-green"
          >
            Open calendar →
          </Link>
        </section>
      </div>
    </WorkspacePageFrame>
  );
}
