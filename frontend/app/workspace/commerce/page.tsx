import { redirect } from "next/navigation";

/** Shop opens on Products. The redirect is instant, with no blank screen. */
export default function CommerceOverviewRedirectPage() {
  redirect("/workspace/commerce/products");
}
