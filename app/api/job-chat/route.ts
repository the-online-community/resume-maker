import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { MODELS } from "@/lib/models";
import { flattenSkills, type UserProfile } from "@/lib/profile";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface JobChatRequest {
  messages: ChatMessage[];
  jobDescription: string;
  userProfile?: UserProfile;
  model?: string;
}

function buildProfileBlock(profile: UserProfile): string {
  const lines: string[] = ["CANDIDATE PROFILE:"];

  if (profile.full_name) lines.push(`Name: ${profile.full_name}`);
  if (profile.location) lines.push(`Location: ${profile.location}`);
  const allSkills = flattenSkills(profile.skills ?? {});
  if (allSkills.length)
    lines.push(`Skills: ${allSkills.join(", ")}`);

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

function buildSystemPrompt(
  jobDescription: string,
  userProfile?: UserProfile,
): string {
  const profileBlock = userProfile
    ? `\n\n${buildProfileBlock(userProfile)}`
    : "";

  return `You are a career advisor helping a candidate evaluate a job and tailor their resume.

JOB DESCRIPTION:
${jobDescription || "(not provided)"}${profileBlock}

YOUR ROLE:
- Help the candidate understand the job requirements and assess their fit
- Answer questions about the role, required skills, and what the employer is looking for
- Provide specific advice on how to position their experience for this role
- When asked to generate resume instructions, write clear, actionable directions for tailoring the resume (e.g. "Emphasize your X experience", "Lead with Y project", "Highlight Z skill prominently")
- Be concise and direct — no filler phrases or corporate speak
- Keep responses to 3-5 sentences unless a longer answer is clearly needed`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JobChatRequest;
    const {
      messages,
      jobDescription,
      userProfile,
      model: modelId = "gpt-4o-mini",
    } = body;

    if (!messages?.length) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const modelDef = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
    const systemPrompt = buildSystemPrompt(jobDescription, userProfile);
    const encoder = new TextEncoder();

    // ── Anthropic ─────────────────────────────────────────────────────────────
    if (modelDef.provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const stream = anthropic.messages.stream({
        model: modelId,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
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
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
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
    console.error("Job chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat message" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
