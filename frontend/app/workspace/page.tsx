"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { KovaStepsGuide } from "@/components/workspace/kova-steps-guide";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import {
  OverviewActionPanel,
  TodayStrip,
  buildOverviewActions,
} from "@/components/workspace/overview-daily-panel";
import { ApiError } from "@/lib/api";
import { getLatestBrief, type MorningBrief } from "@/lib/brief";
import { getOrders, getSocialPosts, peekSocialPosts, type OrderRecord } from "@/lib/operations";
import { getSocialOverview } from "@/lib/social";
import {
  getConnectedChannels,
  getProducts,
  getCommercePage,
  getContents,
  getExpenses,
  getLeads,
  peekExpenses,
  type BusinessExpense,
  type Product,
  type CommercePage,
  type Content,
  type Lead,
} from "@/lib/commerce";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";

function formatName(name: string) {
  if (name === name.toUpperCase() && name.length > 1) {
    return name.charAt(0) + name.slice(1).toLowerCase();
  }
  return name;
}

export default function OverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    business,
    businessId,
    accessToken,
    workspaceLoading,
  } = useWorkspace();

  const [products, setProducts] = useState<Product[]>([]);
  const [commercePage, setCommercePage] = useState<CommercePage | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [failedPosts, setFailedPosts] = useState(0);
  const [hasPosts, setHasPosts] = useState(false);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [deadPages, setDeadPages] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [socialConnected, setSocialConnected] = useState(false);
  const [pendingSocialActions, setPendingSocialActions] = useState(0);
  const [brief, setBrief] = useState<MorningBrief | null>(null);

  useEffect(() => {
    if (workspaceLoading) {
      return;
    }

    if (!businessId || !accessToken) {
      setLoading(false);
      return;
    }

    const token = accessToken;
    const bizId = businessId;
    let cancelled = false;
    const cachedPosts = peekSocialPosts(bizId) ?? [];
    if (cachedPosts.length > 0) {
      setHasPosts(true);
      setFailedPosts(
        cachedPosts.filter((item) => item.publishing_status === "failed").length,
      );
    }
    const cachedExpenses = peekExpenses(bizId);
    if (cachedExpenses) setExpenses(cachedExpenses);

    async function loadOverview() {
      try {
        if (products.length === 0) setLoading(true);
        setError("");

        const [prods, page] = await Promise.all([
          getProducts(bizId, token),
          getCommercePage(bizId, token),
        ]);

        if (cancelled) return;

        setProducts(prods);
        setCommercePage(page);
        setLoading(false);

        const [contentList, leadList, orderList, channels, social, dailyBrief, postList, expenseList] =
          await Promise.all([
            getContents(bizId, token).catch(() => [] as Content[]),
            getLeads(bizId, token).catch(() => [] as Lead[]),
            getOrders(bizId, token).catch(() => [] as OrderRecord[]),
            getConnectedChannels(bizId, token).catch(() => null),
            getSocialOverview(bizId, token).catch(() => null),
            getLatestBrief(bizId, token).catch(() => null),
            getSocialPosts(bizId, token).catch(() => []),
            getExpenses(bizId, token).catch(() => [] as BusinessExpense[]),
          ]);

        if (cancelled) return;

        setContents(contentList);
        setLeads(leadList);
        setOrders(orderList);
        const failedFromPosts = postList.filter(
          (item) => item.publishing_status === "failed",
        ).length;
        const failedFromContent = contentList.filter(
          (item) => item.queue_status === "failed",
        ).length;
        setHasPosts(postList.length > 0 || failedFromContent > 0);
        setExpenses(expenseList);
        setFailedPosts(Math.max(failedFromPosts, failedFromContent));
        setDeadPages(
          (social?.channels?.accounts ?? [])
            .filter((account) => !account.is_healthy)
            .map((account) => ({
              id: account.id,
              name:
                account.account_name ||
                account.account_username ||
                "Disconnected page",
            })),
        );
        setSocialConnected(
          !!channels?.connected ||
            (social?.channels?.accounts?.length ?? 0) > 0 ||
            postList.length > 0,
        );
        setPendingSocialActions(social?.pending_actions ?? 0);
        setBrief(
          dailyBrief && dailyBrief.status === "ready" ? dailyBrief : null,
        );
      } catch (err) {
        if (cancelled) return;

        if (err instanceof ApiError && err.status === 404) {
          router.replace("/workspace/setup");
          return;
        }
        if (
          err instanceof Error &&
          err.message === "No business is configured."
        ) {
          router.replace("/workspace/onboarding");
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your workspace.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [workspaceLoading, businessId, accessToken, router]);

  function copyStoreLink() {
    if (!commercePage?.slug) return;
    const url = `${window.location.origin}/store/${commercePage.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (error) {
    return (
      <WorkspacePageFrame loading={false}>
        <div className="p-4 sm:p-8">
          <div className="mx-auto max-w-5xl rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      </WorkspacePageFrame>
    );
  }

  const activeProducts = products.filter((p) => p.status === "active");
  const newLeads = leads.filter((l) => l.status === "new");
  const now = Date.now();
  const dueFollowUps = leads.filter((lead) => {
    if (["converted", "lost"].includes(lead.status)) return false;
    if (!lead.next_follow_up_at) return lead.status === "new";
    return new Date(lead.next_follow_up_at).getTime() <= now;
  }).length;
  const lowStockCount = activeProducts.filter(
    (product) => product.stock !== null && product.stock <= 2,
  ).length;
  const packingOrders = orders.filter(
    (order) =>
      order.offering_kind !== "service" &&
      ["confirmed", "packing", "out_for_delivery"].includes(order.status),
  ).length;
  const ordersWaiting = orders.filter(
    (order) => !["delivered", "fulfilled", "cancelled"].includes(order.status),
  ).length;
  const replyPeople = new Set(
    leads
      .filter((lead) => {
        if (["converted", "lost"].includes(lead.status)) return false;
        if (!lead.next_follow_up_at) return lead.status === "new";
        return new Date(lead.next_follow_up_at).getTime() <= now;
      })
      .map((lead) => (lead.customer_name || "someone").trim().toLowerCase()),
  ).size;
  const todayKey = new Date().toISOString().slice(0, 10);
  const cashOut = expenses
    .filter((item) => item.spent_on === todayKey)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const approvedContent = contents.filter((c) => c.status === "approved");
  const publishedContent = contents.filter((c) => c.status === "published");
  const storeIsLive = !!commercePage?.is_published;
  const actionItems = buildOverviewActions({
    newLeads,
    dueFollowUps,
    lowStockCount,
    packingOrders,
    failedPosts,
    deadPages,
    hasPosts,
    socialConnected,
    approvedContentCount: approvedContent.length,
    pendingSocialActions,
    storeLive: storeIsLive,
    activeProductCount: activeProducts.length,
    totalProductCount: products.length,
  });
  const storeUrl = commercePage?.slug
    ? `/store/${commercePage.slug}`
    : null;
  const showSetup = products.length === 0;

  return (
    <WorkspacePageFrame loading={false}>
      <div className={WORKSPACE_PAGE}>
        <div className="space-y-6">
          <PageHeader
            title={
              user?.first_name
                ? `Hi ${formatName(user.first_name)}`
                : business?.name || "Today"
            }
            description={business?.name && user?.first_name ? business.name : undefined}
            actions={
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                <Link
                  href="/workspace/kova"
                  className="inline-flex h-10 items-center rounded-lg border border-kova-border bg-white px-4 text-sm font-semibold text-kova-dark transition hover:border-kova-orange/50"
                >
                  Talk to KCOVA
                </Link>
                {storeIsLive && storeUrl ? (
                  <>
                    <a
                      href={storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center rounded-lg border border-kova-border bg-white px-4 text-sm font-semibold text-kova-dark transition hover:border-kova-orange/50"
                    >
                      View store
                    </a>
                    <button
                      type="button"
                      onClick={copyStoreLink}
                      className="inline-flex h-10 items-center rounded-lg border border-kova-border bg-white px-4 text-sm font-semibold text-kova-dark transition hover:border-kova-orange/50"
                    >
                      {copied ? "Copied" : "Share"}
                    </button>
                  </>
                ) : null}
              </div>
            }
          />

          {showSetup && !loading ? (
            <KovaStepsGuide
              title="Get started"
              steps={[
                {
                  letter: "1",
                  title: "Connect",
                  description: "Facebook or Instagram",
                  href: "/workspace/social/channels",
                  done: socialConnected,
                  coach: "connect",
                },
                {
                  letter: "2",
                  title: "Add a product",
                  description: "Snap a photo or enter details",
                  href:
                    products.length > 0
                      ? "/workspace/commerce/products"
                      : "/workspace/commerce/snap-to-sell",
                  done: products.length > 0,
                  coach: "product",
                },
                {
                  letter: "3",
                  title: "Create a post",
                  description: "A photo and a caption",
                  href: "/workspace/social/studio",
                  done: publishedContent.length > 0,
                  coach: "post",
                },
              ]}
            />
          ) : null}

          <TodayStrip
            items={[
              {
                label: "Orders waiting",
                value: String(ordersWaiting),
                href: "/workspace/commerce/orders",
              },
              {
                label: "To reply",
                value: String(replyPeople),
                href: "/workspace/inbox",
              },
              {
                label: "Failed posts",
                value: String(failedPosts),
                href: "/workspace/social",
              },
              {
                label: "Cash out today",
                value: `KES ${Math.round(cashOut).toLocaleString()}`,
                href: "/workspace/commerce/expenses",
              },
            ]}
          />

          <OverviewActionPanel items={actionItems} />

          <p className="text-sm leading-6 text-gray-600">
            {brief?.sections?.pulse?.summary ||
              brief?.greeting ||
              "The last 7 days of posts, orders, and replies."}{" "}
            <Link
              href="/workspace/analytics"
              className="font-semibold text-kova-green hover:underline"
            >
              Analytics
            </Link>
          </p>

          {products.length === 0 && !loading ? (
            <section className="border border-kova-border bg-white px-5 py-6">
              <p className="font-semibold text-kova-dark">No products yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Snap a photo to add your first listing.
              </p>
              <Link
                href="/workspace/commerce/snap-to-sell"
                className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-md bg-kova-orange px-5 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e] sm:h-10 sm:w-auto"
              >
                Snap a photo
              </Link>
            </section>
          ) : null}
        </div>
      </div>
    </WorkspacePageFrame>
  );
}
