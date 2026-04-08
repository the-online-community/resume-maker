import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { MODELS } from "@/lib/models";
import { flattenSkills, type UserProfile } from "@/lib/profile";

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
    const roles = profile.experience.map(
      (e) => `${e.title} at ${e.company}`,
    );
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

const SYSTEM_PROMPT = `You are a career advisor. Given a job description (and optionally a candidate profile), extract key information and return a JSON object with exactly these fields:

- "overview": 2-3 sentence summary of what the role is, the company, and key responsibilities. Be concise.
- "skills": array of 10-25 ATOMIC keywords/technologies/tools required by the job. Each item must be a single, specific, searchable term — e.g. "React", "TypeScript", "Kubernetes", "GraphQL", "CI/CD", "AWS", "Redux", "Tailwind". NEVER group multiple skills into one entry (wrong: "CSS frameworks (Tailwind, Material UI)"). NEVER use parenthetical lists. One skill per item.
- "matchedSkills": array of skills from "skills" that the candidate HAS (subset of "skills"). If no candidate profile provided, return empty array.
- "missingSkills": array of skills from "skills" that the candidate is MISSING. If no candidate profile provided, return empty array.
- "matchScore": integer 0-100 representing how well the candidate matches this role based on skills overlap and experience relevance. If no candidate profile, return 0.
- "summary": 1-2 sentence personalized fit assessment. If no candidate profile, write a generic "ideal candidate" description.

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
    const profileContext = buildProfileContext(userProfile);
    const userMessage = `JOB DESCRIPTION:\n${jobDescription}${profileContext}\n\nAnalyze this job and evaluate candidate fit.`;

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
