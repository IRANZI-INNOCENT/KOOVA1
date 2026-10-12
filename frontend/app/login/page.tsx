"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  ApiError,
} from "@/lib/api";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AuthLayout,
} from "@/components/ui/auth-layout";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  useAuth,
} from "@/lib/auth-context";


export default function LoginPage() {
  const router = useRouter();

  const {
    signIn,
  } = useAuth();


  const [
    email,
    setEmail,
  ] = useState("");


  const [
    password,
    setPassword,
  ] = useState("");


  const [
    showPassword,
    setShowPassword,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  /**
   * Submit the login form.
   *
   * Authentication is delegated to AuthProvider so the page does
   * not need to manage tokens or authentication state itself.
   */
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setError("");
    setLoading(true);


    try {
      await signIn({
        email: email.trim(),
        password,
      });

      router.replace("/workspace");
    } catch (error) {
      console.error(
        "Kova login failed:",
        error,
      );


      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError(
          "We couldn't sign you in. Please try again.",
        );
      }

    } finally {
      setLoading(false);
    }
  }


  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to continue managing your business with Kova."
      footer={
        <>
          Don't have a Kova account?{" "}

          <Link
            href="/signup"
            className="font-semibold text-kova-green transition-colors hover:text-[#12583f]"
          >
            Create one
          </Link>
        </>
      }
    >

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >

        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          placeholder="you@example.com"
          autoComplete="email"
          required
          disabled={loading}
        />


        <div className="relative">

          <Input
            id="password"
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            label="Password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={loading}
            className="pr-20"
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (current) => !current,
              )
            }
            disabled={loading}
            className="absolute right-3 top-[38px] px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:text-kova-green disabled:cursor-not-allowed"
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showPassword
              ? "Hide"
              : "Show"}
          </button>

        </div>


        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          >
            {error}
          </div>
        )}


        <p className="text-xs leading-5 text-gray-500">
          After you sign in, Kova keeps you logged in on this device
          (including the installed app). Sign out anytime from settings.
        </p>

        <Button
          type="submit"
          loading={loading}
          className="w-full"
        >
          Sign in
        </Button>

      </form>

    </AuthLayout>
  );
}