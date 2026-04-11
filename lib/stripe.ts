import Stripe from "stripe";

import { STRIPE_SECRET_KEY } from "@/lib/env.server";

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
});
