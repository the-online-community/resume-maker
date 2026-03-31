import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { MODELS } from "@/lib/models";
import type { UserProfile } from "@/lib/profile";

interface QARequest {
  question: string;
  jobDescription: string;
  userProfile?: UserProfile;
  model?: string;
}

function buildProfileBlock(profile: UserProfile): string {
  const lines: string[] = ["CANDIDATE PROFILE:"];

  if (profile.full_name) lines.push(`Name: ${profile.full_name}`);
  if (profile.location) lines.push(`Location: ${profile.location}`);
  if (profile.skills?.length)
    lines.push(`Skills: ${profile.skills.join(", ")}`);

  if (profile.experience?.length) {
    lines.push("\nWork Experience:");
    for (const e of profile.experience) {
      const dates =
        e.start_date || e.end_date ? ` (${e.start_date} – ${e.end_date})` : "";
      const loc = e.location ? `, ${e.location}` : "";
      lines.push(
        `• ${e.title}${e.company ? ` at ${e.company}` : ""}${loc}${dates}`,
      );
    }
  }

  if (profile.education?.length) {
    lines.push("\nEducation:");
    for (const e of profile.education) {
      lines.push(
        `• ${e.degree}${e.institution ? ` — ${e.institution}` : ""}${e.year ? ` (${e.year})` : ""}`,
      );
    }
  }

  if (profile.projects?.length) {
    lines.push("\nProjects:");
    for (const p of profile.projects) {
      lines.push(
        `• ${p.name}${p.stack ? ` [${p.stack}]` : ""}${p.description ? ` — ${p.description}` : ""}`,
      );
    }
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are helping a job candidate craft strong, authentic interview answers.
Using the job description and the candidate's profile, write a confident and specific answer to the interview question.

RULES:
- Draw directly from the candidate's real experience, skills, and projects — no fabrication
- Reference the job description to show alignment where relevant
- Write in first person, as the candidate speaking
- Keep it natural and conversational — no buzzwords, no filler openers like "Great question"
- 2–4 short paragraphs, no bullet points
- Be specific: name real companies, projects, and technologies from the profile`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QARequest;
    const {
      question,
      jobDescription,
      userProfile,
      model: modelId = "gpt-5-mini",
    } = body;

    if (!question?.trim()) {
      return new Response(JSON.stringify({ error: "Missing question" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const modelDef = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
    const profileBlock = userProfile
      ? `\n\n${buildProfileBlock(userProfile)}`
      : "";

    const userMessage = `JOB DESCRIPTION:\n${jobDescription || "(not provided)"}${profileBlock}\n\nINTERVIEW QUESTION:\n${question}\n\nWrite my answer.`;

    const encoder = new TextEncoder();

    // ── Anthropic ─────────────────────────────────────────────────────────────
    if (modelDef.provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const stream = anthropic.messages.stream({
        model: modelId,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                controller.enqueue(encoder.encode(event.delta.text));
              }
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
        },
      });
    }

    // ── OpenAI ────────────────────────────────────────────────────────────────
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const stream = await openai.chat.completions.create({
      model: modelId,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) controller.enqueue(encoder.encode(content));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Q&A API error:", error);
    return new Response(JSON.stringify({ error: "Failed to answer question" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
