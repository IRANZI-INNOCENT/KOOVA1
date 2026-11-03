"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  getConnectedChannels,
  getContents,
  getProducts,
} from "@/lib/commerce";
import {
  getOnboardingStatus,
  getProfessionalProfile,
  listProfessionalPosts,
} from "@/lib/professional";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";

type StepId =
  | "choose"
  | "setup"
  | "connect"
  | "product"
  | "post"
  | "li-setup"
  | "li-connect"
  | "li-post";

const HIDE_KEY = "kcova-flow-coach-off";

const STEPS: Record<
  StepId,
  { title: string; body: string; href: string; nav: string }
> = {
  choose: {
    title: "Choose a starting point",
    body: "Pick LinkedIn, your business, or both. You can add the other later.",
    href: "/workspace/onboarding",
    nav: "choose",
  },
  setup: {
    title: "Name the business",
    body: "A name is enough to open the workspace. The rest can wait.",
    href: "/workspace/setup",
    nav: "setup",
  },
  connect: {
    title: "Connect a page",
    body: "Facebook or Instagram. KCOVA needs one before it can publish and reply.",
    href: "/workspace/social/channels",
    nav: "nav-post",
  },
  product: {
    title: "Add a product",
    body: "Snap a photo. KCOVA writes the listing.",
    href: "/workspace/commerce/snap-to-sell",
    nav: "nav-shop",
  },
  post: {
    title: "Create a post",
    body: "Turn a product into a post, then publish it when it looks right.",
    href: "/workspace/social/studio",
    nav: "nav-post",
  },
  "li-setup": {
    title: "Set your LinkedIn voice",
    body: "A headline and one topic is enough. KCOVA writes from that.",
    href: "/workspace/linkedin/setup",
    nav: "li-setup",
  },
  "li-connect": {
    title: "Connect LinkedIn",
    body: "This lets KCOVA publish the posts it writes for you.",
    href: "/workspace/linkedin/connect",
    nav: "li-connect",
  },
  "li-post": {
    title: "Share a moment",
    body: "A photo from an event, training, or course. KCOVA writes the post.",
    href: "/workspace/linkedin/event",
    nav: "li-post",
  },
};

type Placement = {
  top: number;
  left: number;
  arrow: "left" | "right" | "up" | "down";
};

function visible(selector: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(selector);
  let fallback: HTMLElement | null = null;
  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) continue;
    const onScreen = rect.bottom > 0 && rect.top < window.innerHeight;
    if (onScreen) return el;
    fallback = fallback ?? el;
  }
  return fallback;
}

function pickTarget(step: StepId): HTMLElement | null {
  const spec = STEPS[step];
  return (
    visible(`[data-coach="${step}"][data-coach-priority="page"]`) ||
    visible(`[data-coach="${step}"]`) ||
    visible(`[data-coach="${spec.nav}"]`)
  );
}

function placeCard(rect: DOMRect): Placement {
  const cardWidth = 268;
  const gap = 14;
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;
  const clampLeft = (value: number) =>
    Math.min(Math.max(8, value), Math.max(8, viewWidth - cardWidth - 8));
  const clampTop = (value: number) =>
    Math.min(Math.max(8, value), Math.max(8, viewHeight - 150));

  if (viewWidth - rect.right >= cardWidth + gap + 8) {
    return {
      top: clampTop(rect.top),
      left: rect.right + gap,
      arrow: "left",
    };
  }
  if (rect.left >= cardWidth + gap + 8) {
    return {
      top: clampTop(rect.top),
      left: rect.left - cardWidth - gap,
      arrow: "right",
    };
  }
  if (viewHeight - rect.bottom >= 150) {
    return {
      top: rect.bottom + gap,
      left: clampLeft(rect.left),
      arrow: "up",
    };
  }
  return {
    top: clampTop(rect.top - 148),
    left: clampLeft(rect.left),
    arrow: "down",
  };
}

export function FlowCoach() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { accessToken, businessId, workspaceLoading } = useWorkspace();
  const [step, setStep] = useState<StepId | null>(null);
  const [target, setTarget] = useState<DOMRect | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(HIDE_KEY);
    setHidden(stored === "1" || stored === String(user?.id ?? ""));
  }, [user?.id]);

  useEffect(() => {
    if (!accessToken || hidden) {
      setStep(null);
      return;
    }
    let cancelled = false;

    async function resolve() {
      if (pathname.startsWith("/workspace/onboarding")) {
        if (!cancelled) setStep("choose");
        return;
      }
      if (pathname.startsWith("/workspace/setup")) {
        if (!cancelled) setStep("setup");
        return;
      }

      let path = "";
      let linkedinReady = false;
      try {
        const status = await getOnboardingStatus(accessToken!);
        path = status.onboarding_path;
        linkedinReady = status.linkedin_setup_complete;
      } catch {
        path = "business";
      }
      if (cancelled) return;

      if (path === "linkedin") {
        if (!linkedinReady) {
          setStep("li-setup");
          return;
        }
        try {
          const profile = await getProfessionalProfile(accessToken!);
          if (profile.linkedin?.connection_status !== "connected") {
            if (!cancelled) setStep("li-connect");
            return;
          }
          const posts = await listProfessionalPosts(accessToken!);
          if (!cancelled) {
            setStep(posts.some((post) => post.status === "published") ? null : "li-post");
          }
        } catch {
          if (!cancelled) setStep("li-connect");
        }
        return;
      }

      if (!businessId || workspaceLoading) {
        if (!cancelled) setStep(pathname.startsWith("/workspace/linkedin") ? null : "setup");
        return;
      }

      try {
        const channels = await getConnectedChannels(businessId, accessToken!);
        if (!channels.connected) {
          if (!cancelled) setStep("connect");
          return;
        }
        const products = await getProducts(businessId, accessToken!);
        if (products.length === 0) {
          if (!cancelled) setStep("product");
          return;
        }
        const contents = await getContents(businessId, accessToken!);
        if (contents.length === 0) {
          if (!cancelled) setStep("post");
          return;
        }
        if (path === "both") {
          const profile = await getProfessionalProfile(accessToken!);
          if (profile.linkedin?.connection_status !== "connected") {
            if (!cancelled) setStep("li-connect");
            return;
          }
        }
        if (!cancelled) setStep(null);
      } catch {
        if (!cancelled) setStep(null);
      }
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [accessToken, businessId, hidden, pathname, workspaceLoading]);

  useEffect(() => {
    if (!step) {
      setTarget(null);
      return;
    }
    const scrolled = { current: "" };

    function measure() {
      const el = pickTarget(step!);
      if (!el) {
        setTarget(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      if (
        scrolled.current !== step &&
        (rect.top > window.innerHeight - 96 || rect.bottom < 72)
      ) {
        scrolled.current = step!;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      setTarget(rect);
    }

    measure();
    const timer = window.setInterval(measure, 500);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, pathname]);

  if (!step || hidden) return null;

  const spec = STEPS[step];
  const placement = target ? placeCard(target) : null;
  const onThisPage = pathname === spec.href || pathname.startsWith(`${spec.href}/`);

  function hide() {
    window.localStorage.setItem(HIDE_KEY, String(user?.id ?? "1"));
    setHidden(true);
  }

  const card = (
    <div className="w-[268px] rounded-xl border border-kova-orange bg-white p-3.5 shadow-lg">
      <p className="text-sm font-semibold text-kova-dark">{spec.title}</p>
      <p className="mt-1 text-sm leading-5 text-gray-600">{spec.body}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        {onThisPage ? (
          <span className="text-xs font-semibold text-kova-green">You are here</span>
        ) : (
          <Link href={spec.href} className="text-xs font-semibold text-kova-green hover:underline">
            Take me there
          </Link>
        )}
        <button
          type="button"
          onClick={hide}
          className="text-xs font-medium text-gray-500 hover:text-kova-dark"
        >
          Hide tips
        </button>
      </div>
    </div>
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-live="polite">
      {target ? (
        <div
          className="pointer-events-none fixed rounded-md ring-2 ring-kova-orange"
          style={{
            top: target.top - 4,
            left: target.left - 4,
            width: target.width + 8,
            height: target.height + 8,
          }}
        />
      ) : null}
      <div
        className="pointer-events-auto fixed"
        style={
          placement
            ? { top: placement.top, left: placement.left }
            : { right: 16, bottom: 88 }
        }
      >
        {placement?.arrow === "left" ? <Caret side="left" /> : null}
        {placement?.arrow === "right" ? <Caret side="right" /> : null}
        {placement?.arrow === "up" ? <Caret side="up" /> : null}
        {placement?.arrow === "down" ? <Caret side="down" /> : null}
        {card}
      </div>
    </div>
  );
}

function Caret({ side }: { side: "left" | "right" | "up" | "down" }) {
  const base = "absolute h-0 w-0 border-solid";
  if (side === "left") {
    return (
      <span
        aria-hidden
        className={`${base} -left-2 top-5 border-y-[8px] border-r-[9px] border-y-transparent border-r-kova-orange`}
      />
    );
  }
  if (side === "right") {
    return (
      <span
        aria-hidden
        className={`${base} -right-2 top-5 border-y-[8px] border-l-[9px] border-y-transparent border-l-kova-orange`}
      />
    );
  }
  if (side === "up") {
    return (
      <span
        aria-hidden
        className={`${base} -top-2 left-6 border-x-[8px] border-b-[9px] border-x-transparent border-b-kova-orange`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${base} -bottom-2 left-6 border-x-[8px] border-t-[9px] border-x-transparent border-t-kova-orange`}
    />
  );
}
