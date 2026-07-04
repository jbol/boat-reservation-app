import type { Operator } from "@prisma/client";

/**
 * Integration tiers from PLAN.md. Today every operator is "deeplink" (Tier 1):
 * we hand the user off to the operator's own checkout and track the
 * reservation as an intent. Affiliate/API/own-inventory adapters slot in here
 * later without touching the UI.
 */
export type BookingHandoff = {
  kind: "deeplink";
  url: string;
  operatorName: string;
};

export interface OperatorAdapter {
  getHandoff(operator: Operator): BookingHandoff;
}

const deepLinkAdapter: OperatorAdapter = {
  getHandoff: (operator) => ({
    kind: "deeplink",
    url: operator.bookingUrl,
    operatorName: operator.name,
  }),
};

export function adapterFor(operator: Operator): OperatorAdapter {
  switch (operator.tier) {
    case "deeplink":
    default:
      return deepLinkAdapter;
  }
}
