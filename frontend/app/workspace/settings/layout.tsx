import { Suspense, type ReactNode } from "react";

function SettingsLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-kova-background">
      <p className="text-sm text-gray-500">Loading your workspace...</p>
    </main>
  );
}

export default function WorkspaceSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <Suspense fallback={<SettingsLoading />}>{children}</Suspense>;
}
