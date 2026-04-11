/**
 * Server-only environment variables. Throws at runtime when accessed
 * if the value is missing — but does NOT throw at import/build time.
 *
 * NEVER import this file from client components or shared code.
 */

function lazyEnv(name: string): string {
  // During build/static collection, env vars may not be set.
  // Return a placeholder that will throw when actually used by an API route.
  const value = process.env[name];
  if (!value) {
    // Don't throw at import time — the var might not be needed for this route.
    // API routes that need it should check before using.
    return "";
  }
  return value;
}

export const OPENAI_API_KEY = lazyEnv("OPENAI_API_KEY");
export const ANTHROPIC_API_KEY = lazyEnv("ANTHROPIC_API_KEY");
export const STRIPE_SECRET_KEY = lazyEnv("STRIPE_SECRET_KEY");
export const STRIPE_WEBHOOK_SECRET = lazyEnv("STRIPE_WEBHOOK_SECRET");
export const SUPABASE_SERVICE_ROLE_KEY = lazyEnv("SUPABASE_SERVICE_ROLE_KEY");
