"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthLayout } from "@/components/ui/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { confirmPasswordReset } from "@/lib/notifications";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!uid || !token) {
      setError("This reset link is incomplete. Request a new one from the sign-in page.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset({ uid, token, password });
      setDone(true);
      window.setTimeout(() => router.replace("/login"), 1600);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not update your password.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      description="Pick a password at least 8 characters long."
      footer={
        <>
          <Link
            href="/login"
            className="font-semibold text-kova-green hover:text-[#12583f]"
          >
            Back to sign in
          </Link>
        </>
      }
    >
      {done ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Password updated. Taking you to sign in…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="password"
            name="password"
            type="password"
            label="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            disabled={loading}
          />
          <Input
            id="confirm"
            name="confirm"
            type="password"
            label="Confirm password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            disabled={loading}
          />
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <Button type="submit" loading={loading} className="w-full">
            Update password
          </Button>
          <p className="text-center text-xs text-gray-500">
            Link expired?{" "}
            <Link href="/forgot-password" className="font-semibold text-kova-green">
              Request a new one
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
