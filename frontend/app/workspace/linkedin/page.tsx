"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PlatformAvatar } from "@/components/social/platform-avatar";
import { PlatformBrandIcon } from "@/components/social/platform-brand";
import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { KovaStepsGuide } from "@/components/workspace/kova-steps-guide";
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
  const hasPillars =
    (profile?.pillars?.length ?? 0) > 0 || !!profile?.profile_setup_complete;

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
      <WorkspacePageFrame embedded requireBusiness={false}>
        <PageSkeleton />
      </WorkspacePageFrame>
    );
  }

  return (
    <WorkspacePageFrame embedded requireBusiness={false}>
      <div className={WORKSPACE_PAGE}>
        <div className="mx-auto max-w-3xl space-y-5">
          <PageHeader
            title="LinkedIn"
            description={
              profile?.headline ||
              "Optional — for professional posts, not your shop."
            }
          />

          {(!isConnected || !hasPillars || posts.length === 0) && (
            <KovaStepsGuide
              title="Setup"
              steps={[
                {
                  letter: "1",
                  title: "Connect",
                  href: "/workspace/linkedin/connect",
                  done: isConnected,
                },
                {
                  letter: "2",
                  title: "Profile",
                  href: "/workspace/linkedin/profile",
                  done: hasPillars,
                },
                {
                  letter: "3",
                  title: "First posts",
                  href: "/workspace/linkedin/topic-week",
                  done: posts.length > 0,
                },
              ]}
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            {isConnected ? (
              <>
                <span className="inline-flex items-center gap-2 border border-kova-border bg-white px-2 py-1 text-sm font-semibold text-kova-dark">
                  <PlatformAvatar
                    platform="linkedin"
                    imageUrl={linkedin?.profile_knowledge?.photo_url}
                    name={
                      linkedin?.display_name ||
                      linkedin?.profile_knowledge?.name
                    }
                    size="sm"
                  />
                  {linkedin?.display_name ||
                    linkedin?.profile_knowledge?.name ||
                    "LinkedIn connected"}
                </span>
                <Link
                  href="/workspace/linkedin/connect"
                  className="text-sm font-semibold text-kova-green hover:underline"
                >
                  Manage connection
                </Link>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <PlatformBrandIcon platform="linkedin" size={20} />
                  Not connected yet.
                </span>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-kova-border bg-white px-3 text-sm font-semibold text-kova-dark hover:border-kova-dark disabled:opacity-60"
                  disabled={connecting}
                  onClick={connectLinkedIn}
                >
                  <PlatformBrandIcon platform="linkedin" size={16} />
                  {connecting ? "Opening LinkedIn…" : "Connect now"}
                </button>
              </>
            )}
          </div>
          {connectMessage ? (
            <p className="text-sm text-amber-800">{connectMessage}</p>
          ) : null}

          <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-kova-border/60 py-3 text-sm">
            <Link
              href="/workspace/linkedin/topic-week"
              className="font-semibold text-kova-dark hover:text-kova-green"
            >
              Topic week
            </Link>
            <Link
              href="/workspace/linkedin/event"
              className="font-semibold text-kova-dark hover:text-kova-green"
            >
              Event
            </Link>
            <Link
              href="/workspace/linkedin/calendar"
              className="font-semibold text-kova-dark hover:text-kova-green"
            >
              Calendar
            </Link>
          </div>

          <section>
            <h2 className="text-base font-semibold text-kova-dark">
              Recent posts
            </h2>
            {posts.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                No drafts yet. Start with Topic week above.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-kova-border border-y border-kova-border">
                {posts.map((post) => (
                  <li key={post.id} className="py-2.5 text-sm">
                    <span className="font-medium text-kova-dark">
                      {post.title || "Untitled"}
                    </span>
                    <span className="ml-2 capitalize text-gray-500">
                      {post.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </WorkspacePageFrame>
  );
}
