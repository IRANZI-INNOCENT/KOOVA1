import { AppShell } from "@/components/workspace/app-shell";
import { PageSkeleton } from "@/components/workspace/page-skeleton";

export default function WorkspaceLoading() {
  return (
    <AppShell>
      <PageSkeleton />
    </AppShell>
  );
}
