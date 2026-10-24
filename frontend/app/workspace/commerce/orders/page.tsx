"use client";

import { useEffect, useState } from "react";
import { WORKSPACE_PAGE } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth-context";
import { getBusiness } from "@/lib/commerce";
import {
  getOrders,
  updateOrder,
  type OrderRecord,
  type OrderStatus,
} from "@/lib/operations";

const NEXT: Record<OrderStatus, OrderStatus | null> = {
  new: "confirmed",
  confirmed: "packing",
  packing: "out_for_delivery",
  out_for_delivery: "delivered",
  delivered: null,
  fulfilled: "delivered",
  cancelled: null,
};

const LABEL: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  packing: "Packing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  fulfilled: "Delivered",
  cancelled: "Cancelled",
};

export default function OrdersPage() {
  const { accessToken, isAuthenticated } = useAuth();
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    const token = accessToken;
    getBusiness(token)
      .then(async (business) => {
        setBusinessId(business.id);
        setOrders(await getOrders(business.id, token));
      })
      .catch(() => setOrders([]));
  }, [accessToken, isAuthenticated]);

  async function advance(order: OrderRecord) {
    const status = NEXT[order.status];
    if (!status || !accessToken || !businessId) return;
    setError("");
    try {
      const updated = await updateOrder(businessId, order.id, accessToken, {
        status,
      });
      setOrders((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order.");
    }
  }

  async function cancel(order: OrderRecord) {
    if (!accessToken || !businessId) return;
    if (order.status === "cancelled" || order.status === "delivered") return;
    setError("");
    try {
      const updated = await updateOrder(businessId, order.id, accessToken, {
        status: "cancelled",
      });
      setOrders((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel order.");
    }
  }

  async function copyReview(order: OrderRecord) {
    const text = order.review_ask_draft?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Could not copy review ask.");
    }
  }

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="mx-auto max-w-3xl space-y-6">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {orders.length === 0 ? (
          <p className="py-6 text-sm text-gray-500">
            No orders yet. They appear when someone orders from your store.
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-lg border border-kova-border bg-white p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-kova-dark">
                      {order.product_name || "Product"} · {order.quantity}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {order.customer_name || "Customer"} · {order.source} ·{" "}
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                    {order.delivery_note || order.rider_name ? (
                      <p className="mt-1 text-xs text-gray-500">
                        {[order.rider_name, order.delivery_note]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-md bg-kova-orange/15 px-2 py-1 text-xs font-bold text-kova-dark">
                    {LABEL[order.status] || order.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {NEXT[order.status] ? (
                    <button
                      type="button"
                      onClick={() => advance(order)}
                      className="inline-flex h-11 items-center rounded-md bg-kova-green px-3 text-xs font-bold text-white"
                    >
                      Mark {LABEL[NEXT[order.status]!] || NEXT[order.status]}
                    </button>
                  ) : null}
                  {order.status !== "cancelled" &&
                  order.status !== "delivered" &&
                  order.status !== "fulfilled" ? (
                    <button
                      type="button"
                      onClick={() => cancel(order)}
                      className="inline-flex h-11 items-center rounded-md border border-kova-border px-3 text-xs font-semibold text-kova-dark"
                    >
                      Cancel
                    </button>
                  ) : null}
                  {order.review_ask_draft ? (
                    <button
                      type="button"
                      onClick={() => copyReview(order)}
                      className="inline-flex h-11 items-center rounded-md border border-kova-border px-3 text-xs font-semibold text-kova-dark"
                    >
                      Copy review ask
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
