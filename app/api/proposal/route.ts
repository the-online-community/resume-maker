import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { MODELS } from "@/lib/models";
import type { UserProfile } from "@/lib/profile";

interface ProposalRequest {
  jobDescription: string;
  userProfile?: UserProfile;
  customPrompt?: string;
  currentProposal?: string; // present when refining an existing proposal
  model?: string;
}

function buildProfileBlock(profile: UserProfile): string {
  const lines: string[] = ["FREELANCER PROFILE:"];

  if (profile.full_name) lines.push(`Name: ${profile.full_name}`);
  if (profile.skills?.length)
    lines.push(`Core Skills: ${profile.skills.join(", ")}`);

  if (profile.experience?.length) {
    lines.push("\nWork History (for context):");
    for (const e of profile.experience) {
      const dates =
        e.start_date || e.end_date ? ` (${e.start_date} – ${e.end_date})` : "";
      lines.push(`• ${e.title}${e.company ? ` at ${e.company}` : ""}${dates}`);
    }
  }

  if (profile.projects?.length) {
    lines.push("\nRelevant Projects:");
    for (const p of profile.projects) {
      lines.push(`• ${p.name}${p.stack ? ` [${p.stack}]` : ""}${p.description ? ` — ${p.description}` : ""}`);
    }
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are an expert Upwork freelancer who writes concise, high-converting proposals.

RULES:
- Read the job description carefully and address the client's specific pain points
- Open with a hook that shows you understand their problem — never start with "Hi, I am..."
- Mention 1–2 relevant projects from the freelancer's profile that directly relate to the job
- Be warm, confident, and direct — no filler phrases like "I am very interested" or "I would love to work"
- Keep it between 150–250 words — clients skim, so be tight
- Write in natural paragraphs, no bullet points
- End with a soft call to action (e.g. "Happy to jump on a quick call — let me know.")
- Do NOT include a subject line, greeting, or sign-off header — start straight into the pitch`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProposalRequest;
    const {
      jobDescription,
      userProfile,
      customPrompt,
      currentProposal,
      model: modelId = "gpt-5-mini",
    } = body;

    if (!jobDescription?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing job description" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const modelDef = MODELS.find((m) => m.id === modelId) ?? MODELS[0];

    // Build the user message
    const profileBlock = userProfile ? `\n\n${buildProfileBlock(userProfile)}` : "";

    const userMessage = currentProposal
      ? `JOB DESCRIPTION:\n${jobDescription}${profileBlock}\n\nCURRENT PROPOSAL:\n${currentProposal}\n\nREFINEMENT INSTRUCTION:\n${customPrompt ?? "Improve the proposal"}\n\nRewrite the proposal incorporating the refinement instruction above.`
      : `JOB DESCRIPTION:\n${jobDescription}${profileBlock}${customPrompt ? `\n\nADDITIONAL INSTRUCTIONS:\n${customPrompt}` : ""}\n\nWrite the proposal now.`;

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
    console.error("Proposal API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate proposal" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
