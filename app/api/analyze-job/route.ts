import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { parseAiJson } from "@/lib/ai-json";
import { ANTHROPIC_API_KEY, OPENAI_API_KEY } from "@/lib/env.server";
import {
  isErrorResponse,
  MAX_JOB_DESCRIPTION,
  safeJson,
  sanitizeString,
} from "@/lib/api/sanitize";
import { MODELS } from "@/lib/models";
import { flattenSkills, type UserProfile } from "@/lib/profile";
import { ANALYZE_JOB_PROMPT } from "@/lib/prompts";
import { getAuthClient } from "@/lib/supabase/server";

interface AnalyzeJobRequest {
  jobDescription: string;
  userProfile?: UserProfile;
  model?: string;
}

interface AnalyzeJobResponse {
  overview: string;
  skills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  matchScore: number;
  summary: string;
}

function buildProfileContext(profile?: UserProfile): string {
  if (!profile) return "";
  const parts: string[] = [];
  const allSkills = flattenSkills(profile.skills ?? {});
  if (allSkills.length) {
    parts.push(`CANDIDATE SKILLS: ${allSkills.join(", ")}`);
  }
  if (profile.experience?.length) {
    const roles = profile.experience.map((e) => `${e.title} at ${e.company}`);
    parts.push(`EXPERIENCE: ${roles.join("; ")}`);
  }
  if (profile.education?.length) {
    const edu = profile.education.map(
      (e) => `${e.degree} from ${e.institution}`,
    );
    parts.push(`EDUCATION: ${edu.join("; ")}`);
  }
  return parts.length > 0 ? `\n\n${parts.join("\n")}` : "";
}


export async function POST(request: Request) {
  const { user } = await getAuthClient();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await safeJson<AnalyzeJobRequest>(request);
  if (isErrorResponse(body)) return body;

  try {
    const jobDescription = sanitizeString(
      body.jobDescription,
      MAX_JOB_DESCRIPTION,
    );
    const userProfile = body.userProfile;
    const modelId = sanitizeString(body.model, 100) || "gpt-4o-mini";

    if (!jobDescription) {
      return new Response(
        JSON.stringify({ error: "Missing job description" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const modelDef = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
    const profileContext = buildProfileContext(userProfile);
    const userMessage = `JOB DESCRIPTION:\n${jobDescription}${profileContext}\n\nAnalyze this job and evaluate candidate fit.`;

    // ── Anthropic ─────────────────────────────────────────────────────────────
    if (modelDef.provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

      const message = await anthropic.messages.create({
        model: modelId,
        max_tokens: 1024,
        system: ANALYZE_JOB_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const text =
        message.content[0]?.type === "text" ? message.content[0].text : "";
      const parsed = parseAiJson<AnalyzeJobResponse>(text);

      return new Response(JSON.stringify(parsed), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── OpenAI ────────────────────────────────────────────────────────────────
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: modelId,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ANALYZE_JOB_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    const parsed = parseAiJson<AnalyzeJobResponse>(text);

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analyze job API error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to analyze job description";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
