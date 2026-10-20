"use client";

import { useEffect, useState } from "react";
import { WORKSPACE_PAGE } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth-context";
import { getBusiness } from "@/lib/commerce";
import { getOrders, updateOrder, type OrderRecord } from "@/lib/operations";

const NEXT: Record<OrderRecord["status"], OrderRecord["status"] | null> = {
  new: "confirmed",
  confirmed: "fulfilled",
  fulfilled: null,
  cancelled: null,
};

export default function OrdersPage() {
  const { accessToken, isAuthenticated } = useAuth();
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);

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
    const updated = await updateOrder(businessId, order.id, accessToken, status);
    setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="mx-auto max-w-3xl space-y-6">
        {orders.length === 0 ? (
          <p className="py-6 text-sm text-gray-500">
            No orders yet. They appear when someone orders from your store.
          </p>
        ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <article key={order.id} className="rounded-lg border border-kova-border bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-kova-dark">
                        {order.product_name || "Product"} · {order.quantity}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {order.customer_name || "Customer"} · {order.source} ·{" "}
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-md bg-kova-orange/15 px-2 py-1 text-xs font-bold text-kova-dark">
                      {order.status}
                    </span>
                  </div>
                  {NEXT[order.status] && (
                    <button
                      type="button"
                      onClick={() => advance(order)}
                      className="mt-3 inline-flex h-8 items-center rounded-md bg-kova-green px-3 text-xs font-bold text-white"
                    >
                      Mark {NEXT[order.status]}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
