/**
 * Centralised environment variable validation.
 *
 * Public vars use direct `process.env.NEXT_PUBLIC_*` references so Next.js
 * can inline them at build time (dynamic lookups break client-side code).
 *
 * Server-only secrets are validated at import time — if any is missing the
 * app fails fast with a clear message instead of a cryptic runtime error.
 */

// ── Public (inlined at build time — safe for browser) ───────────────────────
export const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
export const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const NEXT_PUBLIC_STRIPE_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? "";
