import { createClient } from "@supabase/supabase-js";

import { NEXT_PUBLIC_SUPABASE_URL } from "@/lib/env";
import { SUPABASE_SERVICE_ROLE_KEY } from "@/lib/env.server";
import { getAuthClient } from "@/lib/supabase/server";

/**
 * Creates a Supabase client with the service role key (bypasses RLS).
 * Use only in admin API routes and event tracking.
 */
export function createAdminClient() {
  return createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/** Comma-separated ADMIN_EMAILS env var → Set of lowercase emails */
function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Validates the current user is an admin. Returns the admin Supabase client
 * and user on success, or a Response (401/403) on failure.
 */
export async function requireAdmin() {
  const { user } = await getAuthClient();
  if (!user) {
    return {
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const adminEmails = getAdminEmails();
  if (!adminEmails.has(user.email?.toLowerCase() ?? "")) {
    return {
      error: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  return { adminClient: createAdminClient(), user };
}
