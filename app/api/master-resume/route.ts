import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { parseAiJson } from "@/lib/ai-json";
import { MODELS } from "@/lib/models";
import { flattenSkills, type UserProfile } from "@/lib/profile";
import { MASTER_RESUME_PROMPT } from "@/lib/prompts";
import { rateLimitResponse } from "@/lib/rate-limit";
import { getAuthClient } from "@/lib/supabase/server";

export const maxDuration = 60;

function buildProfileText(profile: UserProfile): string {
  const parts: string[] = [];

  // Contact info
  const contact: string[] = [];
  if (profile.full_name) contact.push(`Name: ${profile.full_name}`);
  if (profile.email) contact.push(`Email: ${profile.email}`);
  if (profile.phone) contact.push(`Phone: ${profile.phone}`);
  if (profile.location) contact.push(`Location: ${profile.location}`);
  if (profile.linkedin) contact.push(`LinkedIn: ${profile.linkedin}`);
  if (profile.github) contact.push(`GitHub: ${profile.github}`);
  if (profile.website) contact.push(`Website: ${profile.website}`);

  // Also check contact_fields for any extra fields
  if (profile.contact_fields?.length) {
    for (const cf of profile.contact_fields) {
      if (cf.value && !["full_name", "email", "phone", "location", "linkedin", "github", "website"].includes(cf.id)) {
        contact.push(`${cf.label}: ${cf.value}`);
      }
    }
  }
  if (contact.length) parts.push("CONTACT:\n" + contact.join("\n"));

  if (profile.years_of_experience) {
    parts.push(`YEARS OF EXPERIENCE: ${profile.years_of_experience}`);
  }

  // Skills (grouped)
  const skillEntries = Object.entries(profile.skills).filter(([, arr]) => arr.length > 0);
  if (skillEntries.length) {
    const skillLines = skillEntries.map(([cat, arr]) => `${cat}: ${arr.join(", ")}`);
    parts.push("SKILLS:\n" + skillLines.join("\n"));
  }

  // Experience
  if (profile.experience.length) {
    const expLines = profile.experience.map((e) => {
      const lines = [`${e.title} at ${e.company}`];
      if (e.location) lines.push(`Location: ${e.location}`);
      lines.push(`${e.start_date} - ${e.end_date}`);
      if (e.projects?.length) lines.push(`Related projects: ${e.projects.join(", ")}`);
      return lines.join("\n");
    });
    parts.push("EXPERIENCE:\n" + expLines.join("\n\n"));
  }

  // Projects
  if (profile.projects.length) {
    const projLines = profile.projects.map((p) => {
      const lines = [p.name];
      if (p.role) lines.push(`Role: ${p.role}`);
      if (p.stack) lines.push(`Stack: ${p.stack}`);
      if (p.description) lines.push(`Description: ${p.description}`);
      if (p.url) lines.push(`URL: ${p.url}`);
      if (p.highlights?.length) {
        lines.push("Highlights:");
        for (const h of p.highlights) {
          if (h.trim()) lines.push(`- ${h}`);
        }
      }
      return lines.join("\n");
    });
    parts.push("PROJECTS:\n" + projLines.join("\n\n"));
  }

  // Education
  if (profile.education.length) {
    const eduLines = profile.education.map((e) => {
      const lines = [`${e.degree} — ${e.institution}`];
      if (e.start_year && e.year) lines.push(`${e.start_year} - ${e.year}`);
      else if (e.year) lines.push(`Graduated: ${e.year}`);
      if (e.achievement) lines.push(`Achievement: ${e.achievement}`);
      return lines.join("\n");
    });
    parts.push("EDUCATION:\n" + eduLines.join("\n\n"));
  }

  // Certifications
  if (profile.certifications?.length) {
    const certLines = profile.certifications.map((c) => {
      const parts = [c.name];
      if (c.issuer) parts.push(`Issuer: ${c.issuer}`);
      if (c.date) parts.push(`Date: ${c.date}`);
      if (c.url) parts.push(`URL: ${c.url}`);
      return parts.join("\n");
    });
    parts.push("CERTIFICATIONS:\n" + certLines.join("\n\n"));
  }

  // Languages
  if (profile.languages?.length) {
    const langLines = profile.languages.map(
      (l) => `${l.language} — ${l.proficiency}`,
    );
    parts.push("LANGUAGES:\n" + langLines.join("\n"));
  }

  return parts.join("\n\n");
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthClient();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const blocked = rateLimitResponse(user.id);
    if (blocked) return blocked;

    const body = await request.json();
    const { profile, model: modelId = "gpt-4o" } = body as {
      profile: UserProfile;
      model?: string;
    };

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Missing profile data" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const modelDef = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
    const profileText = buildProfileText(profile);
    const userMessage = `Here is the user's profile data. Generate their master resume.\n\n${profileText}`;

    let resumeText: string;

    if (modelDef.provider === "anthropic") {
      if (!process.env.ANTHROPIC_API_KEY) {
        return new Response(
          JSON.stringify({ error: "Anthropic API key not configured" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await anthropic.messages.create({
        model: modelId,
        max_tokens: 8192,
        system: MASTER_RESUME_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });
      const text =
        message.content[0]?.type === "text" ? message.content[0].text : "";
      const parsed = parseAiJson<{ resume: string }>(text);
      resumeText = parsed.resume;
    } else {
      if (!process.env.OPENAI_API_KEY) {
        return new Response(
          JSON.stringify({ error: "OpenAI API key not configured" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: modelId,
        max_completion_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: MASTER_RESUME_PROMPT },
          { role: "user", content: userMessage },
        ],
      });
      const text = completion.choices[0]?.message?.content ?? "";
      const parsed = parseAiJson<{ resume: string }>(text);
      resumeText = parsed.resume;
    }

    // Save to profile
    const { error: saveError } = await supabase
      .from("profiles")
      .update({ master_resume: resumeText })
      .eq("user_id", user.id);

    if (saveError) {
      console.error("Failed to save master resume:", saveError);
    }

    return new Response(JSON.stringify({ resume: resumeText }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Master resume API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate master resume";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
