export const SETUP_SECTIONS = [
  "profile",
  "audience",
  "brand",
  "goals",
  "policy",
  "market",
] as const;

export type SetupSection = (typeof SETUP_SECTIONS)[number];

const NEXT_PATH: Record<SetupSection, string | null> = {
  profile: "/workspace/settings/business-audience?setup=1",
  audience: "/workspace/settings/business-brand?setup=1",
  brand: "/workspace/settings/business-goals?setup=1",
  goals: "/workspace/settings/business-policy?setup=1",
  policy: "/workspace/settings/business-market?setup=1",
  market: "/workspace",
};

export function nextSetupPath(section: SetupSection) {
  return NEXT_PATH[section];
}

export const SETUP_LABELS: Record<SetupSection, string> = {
  profile: "Business profile",
  audience: "Customers",
  brand: "Brand",
  goals: "Goals",
  policy: "Policies",
  market: "Market position",
};
