"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "@/lib/auth-context";

import {
  Button,
} from "@/components/ui/button";


/**
 * Kova workspace topbar.
 *
 * The topbar provides contextual workspace information and the
 * authenticated user's account controls.
 */
export function Topbar() {
  const router = useRouter();

  const {
    user,
    signOut,
  } = useAuth();


  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);


  /**
   * Sign the user out and return them to the login page.
   */
  async function handleLogout(): Promise<void> {
    setLoggingOut(true);


    try {
      await signOut();

      router.push("/login");

    } finally {
      setLoggingOut(false);
    }
  }


  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-kova-border bg-white px-6 sm:px-8">

      {/* Workspace context */}
      <div>

        <p className="text-sm font-medium text-gray-500">
          Workspace
        </p>

        <h1 className="mt-0.5 text-lg font-semibold text-kova-dark">
          Overview
        </h1>

      </div>


      {/* Account area */}
      <div className="flex items-center gap-4">

        <div className="hidden text-right sm:block">

          <p className="text-sm font-semibold text-kova-dark">
            {user?.first_name}{" "}
            {user?.last_name}
          </p>

          <p className="text-xs text-gray-500">
            {user?.email}
          </p>

        </div>


        <div className="flex h-9 w-9 items-center justify-center bg-kova-green text-sm font-semibold text-white">
          {user?.first_name
            ?.charAt(0)
            .toUpperCase()}
        </div>


        <Button
          type="button"
          variant="ghost"
          loading={loggingOut}
          onClick={handleLogout}
          className="px-3 py-2 text-xs"
        >
          Sign out
        </Button>

      </div>

    </header>
  );
}