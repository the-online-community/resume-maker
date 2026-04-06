import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { MODELS } from "@/lib/models";
import type { UserProfile } from "@/lib/profile";

interface AnalyzeJobRequest {
  jobDescription: string;
  userProfile?: UserProfile;
  model?: string;
}

interface AnalyzeJobResponse {
  skills: string[];
  summary: string;
}

function buildProfileSkills(profile?: UserProfile): string {
  if (!profile?.skills?.length) return "";
  return `\n\nCANDIDATE SKILLS: ${profile.skills.join(", ")}`;
}

const SYSTEM_PROMPT = `You are a career advisor. Given a job description, extract key information and return a JSON object with exactly these two fields:
- "skills": array of 8-15 key skills/technologies/qualifications required (short phrases, no duplicates)
- "summary": 2-3 sentence assessment of what the role is and what kind of candidate would be a strong fit

Return ONLY valid JSON, no markdown, no extra text.`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeJobRequest;
    const {
      jobDescription,
      userProfile,
      model: modelId = "gpt-4o-mini",
    } = body;

    if (!jobDescription?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing job description" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const modelDef = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
    const profileContext = buildProfileSkills(userProfile);
    const userMessage = `JOB DESCRIPTION:\n${jobDescription}${profileContext}\n\nExtract the required skills and write a fit summary.`;

    // ── Anthropic ─────────────────────────────────────────────────────────────
    if (modelDef.provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const message = await anthropic.messages.create({
        model: modelId,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      const parsed = JSON.parse(text) as AnalyzeJobResponse;

      return new Response(JSON.stringify(parsed), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── OpenAI ────────────────────────────────────────────────────────────────
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: modelId,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text) as AnalyzeJobResponse;

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analyze job API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to analyze job description" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
