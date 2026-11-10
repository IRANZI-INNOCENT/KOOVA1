"use client";

import { useEffect, useState } from "react";
import { BusyButton } from "@/components/ui/busy-button";
import { WORKSPACE_PAGE } from "@/components/ui/page-header";
import { useWorkspace } from "@/lib/workspace-context";
import {
  getOrders,
  peekOrders,
  updateOrder,
  type OrderRecord,
  type OrderStatus,
} from "@/lib/operations";
import { invalidateResourceCache } from "@/lib/resource-cache";

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
  const { accessToken, businessId, workspaceLoading } = useWorkspace();
  const [orders, setOrders] = useState<OrderRecord[]>(
    () => (businessId ? peekOrders(businessId) : undefined) ?? [],
  );
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (workspaceLoading || !businessId || !accessToken) return;
    const token = accessToken;
    const bizId = businessId;
    const cached = peekOrders(bizId);
    if (cached) setOrders(cached);
    getOrders(bizId, token)
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [accessToken, businessId, workspaceLoading]);

  async function advance(order: OrderRecord) {
    const status =
      order.offering_kind === "service"
        ? order.status === "new"
          ? "confirmed"
          : null
        : NEXT[order.status];
    if (!status || !accessToken || !businessId || busyKey) return;
    const key = `order-${order.id}-advance`;
    setBusyKey(key);
    setError("");
    try {
      const updated = await updateOrder(businessId, order.id, accessToken, {
        status,
      });
      setOrders((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(`Marked as ${LABEL[status] || status}.`);
      if (status === "delivered") {
        invalidateResourceCache(`leads:${businessId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order.");
    } finally {
      setBusyKey(null);
    }
  }

  async function cancel(order: OrderRecord) {
    if (!accessToken || !businessId || busyKey) return;
    if (order.status === "cancelled" || order.status === "delivered") return;
    const key = `order-${order.id}-cancel`;
    setBusyKey(key);
    setError("");
    try {
      const updated = await updateOrder(businessId, order.id, accessToken, {
        status: "cancelled",
      });
      setOrders((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice("Order cancelled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel order.");
    } finally {
      setBusyKey(null);
    }
  }

  async function copyReview(order: OrderRecord) {
    const text = order.review_ask_draft?.trim();
    if (!text || busyKey) return;
    const key = `order-${order.id}-copy`;
    setBusyKey(key);
    setError("");
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Review ask copied.");
    } catch {
      setError("Could not copy review ask.");
    } finally {
      setBusyKey(null);
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
        {notice && !error ? (
          <p className="rounded-md border border-kova-green/30 bg-kova-green/5 px-3 py-2 text-sm font-medium text-kova-green">
            {notice}
          </p>
        ) : null}
        {orders.length === 0 ? (
          <p className="py-6 text-sm text-gray-500">
            No orders yet. They appear when someone taps Order on your store or
            you create one from a lead.
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const next =
                order.offering_kind === "service"
                  ? order.status === "new"
                    ? "confirmed"
                    : null
                  : NEXT[order.status];
              return (
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
                  {next ? (
                    <BusyButton
                      busy={busyKey === `order-${order.id}-advance`}
                      busyLabel="Saving…"
                      onClick={() => void advance(order)}
                      className="h-11 rounded-md bg-kova-green px-3 text-xs font-bold text-white"
                    >
                      Mark {LABEL[next] || next}
                    </BusyButton>
                  ) : null}
                  {order.status !== "cancelled" &&
                  order.status !== "delivered" &&
                  order.status !== "fulfilled" ? (
                    <BusyButton
                      busy={busyKey === `order-${order.id}-cancel`}
                      busyLabel="Cancelling…"
                      onClick={() => void cancel(order)}
                      className="h-11 rounded-md border border-kova-border px-3 text-xs font-semibold text-kova-dark"
                    >
                      Cancel
                    </BusyButton>
                  ) : null}
                  {order.review_ask_draft ? (
                    <BusyButton
                      busy={busyKey === `order-${order.id}-copy`}
                      busyLabel="Copying…"
                      onClick={() => void copyReview(order)}
                      className="h-11 rounded-md border border-kova-border px-3 text-xs font-semibold text-kova-dark"
                    >
                      Copy review ask
                    </BusyButton>
                  ) : null}
                </div>
              </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
