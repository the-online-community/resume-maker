import { isErrorResponse, safeJson, sanitizeString } from "@/lib/api/sanitize";
import { getAuthClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/profile";

export async function GET() {
  try {
    const { supabase, user } = await getAuthClient();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    return new Response(JSON.stringify(data ?? null), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch profile" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase, user } = await getAuthClient();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await safeJson<Partial<UserProfile>>(request);
    if (isErrorResponse(body)) return body;

    // Sanitize top-level string fields
    if (body.full_name !== undefined) body.full_name = sanitizeString(body.full_name, 200);
    if (body.email !== undefined) body.email = sanitizeString(body.email, 320);
    if (body.phone !== undefined) body.phone = sanitizeString(body.phone, 50);
    if (body.location !== undefined) body.location = sanitizeString(body.location, 200);
    if (body.linkedin !== undefined) body.linkedin = sanitizeString(body.linkedin, 500);
    if (body.github !== undefined) body.github = sanitizeString(body.github, 500);
    if (body.website !== undefined) body.website = sanitizeString(body.website, 500);

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        { ...body, user_id: user.id },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("PUT /api/profile error:", err);
    return new Response(JSON.stringify({ error: "Failed to save profile" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
