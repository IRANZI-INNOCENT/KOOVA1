import { authenticatedApiRequest } from "@/lib/api";
import {
  cachedResource,
  invalidateResourceCache,
  peekResourceCache,
} from "@/lib/resource-cache";

const TTL_MS = 90_000;

export type AnalyticsPeriod = "7d" | "30d" | "90d" | "365d";

export interface AnalyticsKpi {
  value: number;
  previous: number | null;
  change_pct: number | null;
}

export interface BusinessAnalyticsReport {
  period: {
    label: string;
    days: number;
    start: string;
    end: string;
  };
  comparison_period: { start: string; end: string };
  currency: string;
  availability: {
    revenue: boolean;
    gross_profit: boolean;
    payment_status: boolean;
    social_engagement: boolean;
    meta_reach: boolean;
  };
  definitions: Record<string, string>;
  kpis: Record<string, AnalyticsKpi & { value: number }>;
  leads: {
    funnel: Record<string, number>;
    conversion_rate_pct: number | null;
  };
  series: {
    orders_by_day: { date: string; count: number }[];
    expenses_by_day: { date: string; amount: string }[];
    leads_by_day: { date: string; count: number }[];
  };
  products: {
    low_stock: {
      id: number;
      name: string;
      stock: number | null;
      sku: string;
    }[];
    top_by_order_volume: {
      product_id: number;
      name: string;
      orders: number;
    }[];
  };
  marketing: {
    content_published_in_workspace: number;
    posts_published: number;
    engagement_totals: Record<string, number>;
  };
}

function cacheKey(businessId: number, period: AnalyticsPeriod): string {
  return `analytics:${businessId}:${period}`;
}

export function peekBusinessAnalytics(
  businessId: number,
  period: AnalyticsPeriod,
): BusinessAnalyticsReport | undefined {
  return peekResourceCache<BusinessAnalyticsReport>(cacheKey(businessId, period));
}

export function invalidateAnalyticsCache(businessId: number): void {
  for (const period of ["7d", "30d", "90d", "365d"] as const) {
    invalidateResourceCache(cacheKey(businessId, period));
  }
}

export async function getBusinessAnalytics(
  businessId: number,
  token: string,
  period: AnalyticsPeriod = "7d",
): Promise<BusinessAnalyticsReport> {
  return cachedResource(
    cacheKey(businessId, period),
    TTL_MS,
    () =>
      authenticatedApiRequest<BusinessAnalyticsReport>(
        `/commerce/${businessId}/analytics/?period=${period}`,
        token,
      ),
  );
}
