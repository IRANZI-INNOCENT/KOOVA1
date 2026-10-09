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

import {
  signup,
} from "@/lib/auth";


export default function SignupPage() {
  const router = useRouter();

  const {
    signIn,
  } = useAuth();


  const [
    firstName,
    setFirstName,
  ] = useState("");


  const [
    lastName,
    setLastName,
  ] = useState("");


  const [
    email,
    setEmail,
  ] = useState("");


  const [
    password,
    setPassword,
  ] = useState("");


  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");


  const [
    showPassword,
    setShowPassword,
  ] = useState(false);


  const [
    showConfirmPassword,
    setShowConfirmPassword,
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
   * Submit the signup form.
   *
   * Account creation is followed by a normal login so that a new
   * user enters Kova already authenticated instead of having to
   * submit the same credentials twice.
   */
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setError("");


    if (password !== confirmPassword) {
      setError(
        "Your passwords do not match.",
      );

      return;
    }


    if (password.length < 8) {
      setError(
        "Your password must contain at least 8 characters.",
      );

      return;
    }


    setLoading(true);


    try {
      await signup({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
      });


      await signIn({
        email: email.trim(),
        password,
      });


      router.push("/workspace/setup");

        } catch (error) {
      console.error(
        "Kova signup failed:",
        error,
      );


      if (error instanceof ApiError) {
        setError(error.message);
      } else {
        setError(
          "We couldn't create your account. Please try again.",
        );
      }

    } finally {
      setLoading(false);
    }
  }


  return (
    <AuthLayout
      title="Create your account"
      description="Start building and managing your business with Kova."
      footer={
        <>
          Already have a Kova account?{" "}

          <Link
            href="/login"
            className="font-semibold text-kova-green transition-colors hover:text-[#12583f]"
          >
            Sign in
          </Link>
        </>
      }
    >

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >

        {/* Name fields */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

          <Input
            id="first-name"
            name="first_name"
            type="text"
            label="First name"
            value={firstName}
            onChange={(event) =>
              setFirstName(event.target.value)
            }
            placeholder="First name"
            autoComplete="given-name"
            required
            disabled={loading}
          />


          <Input
            id="last-name"
            name="last_name"
            type="text"
            label="Last name"
            value={lastName}
            onChange={(event) =>
              setLastName(event.target.value)
            }
            placeholder="Last name"
            autoComplete="family-name"
            required
            disabled={loading}
          />

        </div>


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


        {/* Password */}
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
            placeholder="Create a password"
            autoComplete="new-password"
            required
            disabled={loading}
            helpText="Use at least 8 characters."
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


        {/* Confirm password */}
        <div className="relative">

          <Input
            id="confirm-password"
            name="confirm_password"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            label="Confirm password"
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(
                event.target.value,
              )
            }
            placeholder="Enter your password again"
            autoComplete="new-password"
            required
            disabled={loading}
            className="pr-20"
          />


          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword(
                (current) => !current,
              )
            }
            disabled={loading}
            className="absolute right-3 top-[38px] px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:text-kova-green disabled:cursor-not-allowed"
            aria-label={
              showConfirmPassword
                ? "Hide password"
                : "Show password"
            }
          >
            {showConfirmPassword
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


        <Button
          type="submit"
          loading={loading}
          className="w-full"
        >
          Create account
        </Button>

      </form>

    </AuthLayout>
  );
}