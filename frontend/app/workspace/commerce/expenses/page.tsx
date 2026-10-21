"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { WORKSPACE_PAGE } from "@/components/ui/page-header";
import { useAuth } from "@/lib/auth-context";
import {
  createExpense,
  deleteExpense,
  getBusiness,
  getExpenses,
  type BusinessExpense,
} from "@/lib/commerce";

const CATEGORIES = [
  { value: "rider", label: "Rider" },
  { value: "packaging", label: "Packaging" },
  { value: "restock", label: "Restock" },
  { value: "ads", label: "Ads" },
  { value: "other", label: "Other" },
] as const;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const { accessToken, isAuthenticated } = useAuth();
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("rider");
  const [note, setNote] = useState("");
  const [spentOn, setSpentOn] = useState(todayISO());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function reload(bizId: number, token: string) {
    setExpenses(await getExpenses(bizId, token));
  }

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    const token = accessToken;
    getBusiness(token)
      .then(async (business) => {
        setBusinessId(business.id);
        await reload(business.id, token);
      })
      .catch(() => setExpenses([]));
  }, [accessToken, isAuthenticated]);

  const todayTotal = useMemo(() => {
    const today = todayISO();
    return expenses
      .filter((item) => item.spent_on === today)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !businessId) return;
    setSaving(true);
    setError("");
    try {
      await createExpense(businessId, accessToken, {
        amount,
        category,
        note,
        spent_on: spentOn,
      });
      setAmount("");
      setNote("");
      await reload(businessId, accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save expense.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(expense: BusinessExpense) {
    if (!accessToken || !businessId) return;
    await deleteExpense(businessId, expense.id, accessToken);
    setExpenses((current) => current.filter((item) => item.id !== expense.id));
  }

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm text-gray-500">Cash out today</p>
          <p className="mt-1 text-2xl font-semibold text-kova-dark">
            KES {todayTotal.toLocaleString()}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-lg border border-kova-border bg-white p-4"
        >
          <p className="text-sm font-semibold text-kova-dark">Log an expense</p>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-gray-500">Amount (KES)</span>
              <input
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                min="1"
                step="0.01"
                className="w-full rounded-md border border-kova-border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-500">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-md border border-kova-border px-3 py-2"
              >
                {CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-500">Date</span>
              <input
                type="date"
                value={spentOn}
                onChange={(event) => setSpentOn(event.target.value)}
                className="w-full rounded-md border border-kova-border px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-gray-500">Note</span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="w-full rounded-md border border-kova-border px-3 py-2"
                placeholder="Optional"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center rounded-md bg-kova-green px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add expense"}
          </button>
        </form>

        <div className="space-y-2">
          {expenses.length === 0 ? (
            <p className="text-sm text-gray-500">
              No expenses logged yet. Rider fees and packaging go here.
            </p>
          ) : (
            expenses.map((expense) => (
              <article
                key={expense.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-kova-border bg-white p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-kova-dark">
                    {expense.currency} {Number(expense.amount).toLocaleString()} ·{" "}
                    {expense.category}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {expense.spent_on}
                    {expense.note ? ` · ${expense.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(expense)}
                  className="text-xs font-semibold text-gray-500 hover:text-red-600"
                >
                  Delete
                </button>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
