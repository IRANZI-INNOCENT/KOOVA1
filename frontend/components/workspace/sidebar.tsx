import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/ui/logo";


/**
 * Navigation item displayed in the Kova workspace sidebar.
 *
 * The navigation structure is centralized here so adding or
 * removing workspace sections does not require modifying the
 * application shell itself.
 */
interface NavigationItem {
  label: string;
  href: string;
}


/**
 * Primary Kova workspace navigation.
 *
 * These routes represent the major operational areas of Kova.
 */
const navigationItems: NavigationItem[] = [
  {
    label: "Overview",
    href: "/workspace",
  },
  {
    label: "Social",
    href: "/workspace/social",
  },
  {
    label: "Commerce",
    href: "/workspace/commerce",
  },
  {
    label: "Inbox",
    href: "/workspace/inbox",
  },
  {
    label: "Leads",
    href: "/workspace/leads",
  },
  {
    label: "Analytics",
    href: "/workspace/analytics",
  },
];


/**
 * Secondary navigation.
 *
 * Settings contains configuration and business-management
 * features such as the Business Brain.
 *
 * Business Brain is intentionally not a top-level sidebar
 * destination because it is part of the Settings experience.
 */
const secondaryNavigationItems: NavigationItem[] = [
  {
    label: "Settings",
    href: "/workspace/settings",
  },
];


/**
 * Kova workspace sidebar.
 *
 * The sidebar is responsible only for navigation.
 * Authentication and business state remain managed elsewhere
 * in the application.
 */
export function Sidebar() {
  const pathname = usePathname();


  /**
   * Determine whether a navigation item represents the
   * current page.
   *
   * Overview requires an exact match because every other
   * workspace route begins with /workspace.
   */
  function isActive(
    item: NavigationItem,
  ): boolean {
    if (item.href === "/workspace") {
      return pathname === "/workspace";
    }


    return pathname.startsWith(item.href);
  }


  return (
    <aside
      className="
        hidden
        w-64
        shrink-0
        border-r
        border-kova-border
        bg-white
        lg:flex
        lg:min-h-screen
        lg:flex-col
      "
    >

      {/* Brand */}
      <div
        className="
          flex
          h-20
          items-center
          border-b
          border-kova-border
          px-6
        "
      >
        <Logo
          href="/workspace"
          showTagline={false}
        />
      </div>


      {/* Navigation */}
      <nav
        aria-label="Workspace navigation"
        className="flex-1 px-4 py-6"
      >

        {/* Primary navigation */}
        <div>

          <p
            className="
              px-3
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.16em]
              text-gray-400
            "
          >
            Workspace
          </p>


          <div className="mt-3 space-y-1">

            {navigationItems.map(
              (item) => {
                const active = isActive(item);


                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={
                      active
                        ? "page"
                        : undefined
                    }
                    className={`
                      flex
                      items-center
                      px-3
                      py-2.5
                      text-sm
                      font-medium
                      transition-colors
                      ${
                        active
                          ? "bg-kova-background text-kova-green"
                          : "text-gray-600 hover:bg-kova-background hover:text-kova-dark"
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                );
              },
            )}

          </div>

        </div>


        {/* Secondary navigation */}
        <div className="mt-10">

          <p
            className="
              px-3
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.16em]
              text-gray-400
            "
          >
            Account
          </p>


          <div className="mt-3 space-y-1">

            {secondaryNavigationItems.map(
              (item) => {
                const active = isActive(item);


                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={
                      active
                        ? "page"
                        : undefined
                    }
                    className={`
                      flex
                      items-center
                      px-3
                      py-2.5
                      text-sm
                      font-medium
                      transition-colors
                      ${
                        active
                          ? "bg-kova-background text-kova-green"
                          : "text-gray-600 hover:bg-kova-background hover:text-kova-dark"
                      }
                    `}
                  >
                    {item.label}
                  </Link>
                );
              },
            )}

          </div>

        </div>

      </nav>

    </aside>
  );
}