import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { ANTHROPIC_API_KEY, OPENAI_API_KEY } from "@/lib/env.server";
import { trackEvent, trackApiError } from "@/lib/admin/track";
import { rateLimitResponse } from "@/lib/rate-limit";
import {
  isErrorResponse,
  MAX_JOB_DESCRIPTION,
  MAX_RESUME_TEXT,
  MAX_SHORT_TEXT,
  safeJson,
  sanitizeString,
} from "@/lib/api/sanitize";
import { MODELS } from "@/lib/models";
import type { UserProfile } from "@/lib/profile";
import { buildTailorPromptPlaceholder, buildTailorPromptWithData } from "@/lib/prompts";
import { getAuthClient } from "@/lib/supabase/server";
import type { TemplateSettings } from "@/lib/resume/templates";

interface TailorRequest {
  jobDescription: string;
  resumeTexts: string[];
  placeholders: string[];
  targetPages?: number;
  userName?: string;
  userEmail?: string;
  customPrompt?: string;
  templateSettings?: TemplateSettings;
  model?: string;
  userProfile?: UserProfile;
}

/**
 * Builds a profile context block to inject into the AI system prompt.
 * Only surfaces links that are toggled ON in the user's template settings —
 * the AI is already told which header fields to include, but giving it the
 * actual values here ensures it never falls back to placeholders.
 */
function buildProfileContext(
  profile: UserProfile,
  templateSettings?: TemplateSettings,
): string {
  const lines: string[] = [
    "USER PROFILE — always use these exact values; never substitute placeholders:",
  ];

  // Dynamic contact fields (new format)
  if (profile.contact_fields?.length) {
    for (const cf of profile.contact_fields) {
      if (cf.value && cf.visible) {
        lines.push(`• ${cf.label}: ${cf.value}`);
      }
    }
  } else {
    // Legacy fallback: fixed fields
    const enabledFields = new Set(
      templateSettings?.headerFields ?? [
        "EMAIL", "PHONE", "LOCATION", "LINKEDIN", "GITHUB", "WEBSITE",
      ],
    );
    if (profile.full_name) lines.push(`• Full Name: ${profile.full_name}`);
    if (profile.email && enabledFields.has("EMAIL"))
      lines.push(`• Email: ${profile.email}`);
    if (profile.phone && enabledFields.has("PHONE"))
      lines.push(`• Phone: ${profile.phone}`);
    if (profile.location && enabledFields.has("LOCATION"))
      lines.push(`• Location: ${profile.location}`);
    if (profile.linkedin && enabledFields.has("LINKEDIN"))
      lines.push(`• LinkedIn: ${profile.linkedin}`);
    if (profile.github && enabledFields.has("GITHUB"))
      lines.push(`• GitHub: ${profile.github}`);
    if (profile.website && enabledFields.has("WEBSITE"))
      lines.push(`• Website: ${profile.website}`);
  }
  const skillsMap = profile.skills ?? {};
  const skillCategories = Object.keys(skillsMap);
  if (skillCategories.length) {
    lines.push("\nSkills by Category (use these for smart skill selection):");
    for (const category of skillCategories) {
      const skills = skillsMap[category];
      if (skills?.length) {
        lines.push(`• ${category}: ${skills.join(", ")}`);
      }
    }
  }

  if (profile.years_of_experience != null) {
    lines.push(`• Total Years of Experience: ${profile.years_of_experience}`);
  }

  // Build a lookup of projects by name for linking
  const projectsByName = new Map(
    (profile.projects ?? []).filter((p) => p.name).map((p) => [p.name, p]),
  );

  if (profile.experience?.length) {
    lines.push("\nBackground Experience (context — tailor bullets around this):");
    for (const e of profile.experience) {
      const dates =
        e.start_date || e.end_date ? ` | ${e.start_date} – ${e.end_date}` : "";
      const loc = e.location ? ` | ${e.location}` : "";
      lines.push(`• ${e.title}${e.company ? ` at ${e.company}` : ""}${loc}${dates}`);

      // Inline linked projects with their highlights
      if (e.projects?.length) {
        for (const pName of e.projects) {
          const proj = projectsByName.get(pName);
          if (proj) {
            const parts = [`  → Project: ${proj.name}`];
            if (proj.stack) parts.push(`    Stack: ${proj.stack}`);
            if (proj.description) parts.push(`    ${proj.description}`);
            if (proj.highlights?.length)
              parts.push(`    Highlights: ${proj.highlights.join("; ")}`);
            lines.push(parts.join("\n"));
          }
        }
      }
    }
  }

  if (profile.education?.length) {
    lines.push("\nBackground Education:");
    for (const e of profile.education) {
      const years = [e.start_year, e.year].filter(Boolean).join(" – ");
      let line = `• ${e.degree}${e.institution ? `, ${e.institution}` : ""}${years ? ` | ${years}` : ""}`;
      if (e.achievement) line += `\n  Achievement: ${e.achievement}`;
      lines.push(line);
    }
  }

  if (profile.projects?.length) {
    lines.push(
      "\nProjects & Achievements (select the most relevant for the target job — write bullet points grounded in these, do not invent):",
    );
    for (const p of profile.projects) {
      const parts = [`• ${p.name}`];
      if (p.role) parts[0] += ` (${p.role})`;
      if (p.stack) parts.push(`  Stack: ${p.stack}`);
      if (p.description) parts.push(`  ${p.description}`);
      if (p.highlights?.length)
        parts.push(`  Key highlights: ${p.highlights.join("; ")}`);
      lines.push(parts.join("\n"));
    }
  }

  if (profile.certifications?.length) {
    lines.push("\nCertifications:");
    for (const c of profile.certifications) {
      let line = `• ${c.name}`;
      if (c.issuer) line += ` — ${c.issuer}`;
      if (c.date) line += ` (${c.date})`;
      lines.push(line);
    }
  }

  if (profile.languages?.length) {
    lines.push(
      `\nLanguages: ${profile.languages.map((l) => `${l.language} (${l.proficiency})`).join(", ")}`,
    );
  }

  return lines.join("\n");
}

export async function POST(request: Request) {
  const { user } = await getAuthClient();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const blocked = rateLimitResponse(user.id);
  if (blocked) return blocked;

  const parsed = await safeJson<TailorRequest>(request);
  if (isErrorResponse(parsed)) return parsed;

  try {
    const body = parsed;
    const jobDescription = sanitizeString(body.jobDescription, MAX_JOB_DESCRIPTION);
    const resumeTexts = (body.resumeTexts ?? []).map((t) =>
      sanitizeString(t, MAX_RESUME_TEXT),
    );
    const placeholders = Array.isArray(body.placeholders) ? body.placeholders : [];
    const targetPages = body.targetPages ?? 1;
    const userName = sanitizeString(body.userName, 200);
    const userEmail = sanitizeString(body.userEmail, 320);
    const customPrompt = sanitizeString(body.customPrompt, MAX_SHORT_TEXT);
    const { templateSettings, userProfile } = body;
    const modelId = sanitizeString(body.model, 100) || "gpt-5-mini";

    const hasResumes = resumeTexts && resumeTexts.length > 0;
    const hasProfile = !!userProfile && (
      !!userProfile.full_name ||
      (userProfile.experience?.length ?? 0) > 0 ||
      (userProfile.education?.length ?? 0) > 0 ||
      Object.keys(userProfile.skills ?? {}).length > 0
    );
    const hasRealData = hasResumes || hasProfile;

    if (!jobDescription || !placeholders.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const modelDef = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
    const placeholderList = placeholders.join(", ");

    // Build profile context block (only when profile data is provided)
    const profileContext =
      userProfile ? `\n\n${buildProfileContext(userProfile, templateSettings)}` : "";

    // Build template-specific instructions for the AI
    const bulletChar = templateSettings?.bulletStyle === "dash" ? "—" : "•";
    const templateInstructions = templateSettings
      ? `\n\nTEMPLATE SETTINGS:\n- Use "${bulletChar}" as the bullet character for experience bullet points.\n- Only generate these sections: ${templateSettings.sections.join(", ")}. Omit any section not listed.\n- Only include these header/contact fields: ${templateSettings.headerFields.join(", ")}. Leave other contact fields as empty strings.`
      : "";

    const promptParams = {
      hasResumes,
      targetPages,
      placeholderList,
      profileContext,
      templateInstructions,
      customPrompt,
      userName,
      userEmail,
    };

    const systemPrompt = hasRealData
      ? buildTailorPromptWithData(promptParams)
      : buildTailorPromptPlaceholder(promptParams);

    const resumeBlock = hasResumes
      ? `\nUSER'S RESUME(S):\n${resumeTexts.map((text, i) => `--- Resume ${i + 1} ---\n${text}`).join("\n\n")}`
      : "";

    const userMessage = hasRealData
      ? `JOB DESCRIPTION:
${jobDescription}
${resumeBlock}
${customPrompt ? `\nUSER'S ADDITIONAL INSTRUCTIONS:\n${customPrompt}\n` : ""}
Generate the tailored resume data as JSON with these fields: ${placeholderList}`
      : `JOB DESCRIPTION:
${jobDescription}

USER INFO:
- Name: ${userName || "[Your Name]"}
- Email: ${userEmail || "[your.email@example.com]"}
${customPrompt ? `\nUSER'S ADDITIONAL INSTRUCTIONS:\n${customPrompt}\n` : ""}
Generate a resume draft as JSON with these fields: ${placeholderList}`;

    const encoder = new TextEncoder();

    // ── Anthropic ───────────────────────────────────────────────────────────
    if (modelDef.provider === "anthropic") {
      const anthropic = new Anthropic({
        apiKey: ANTHROPIC_API_KEY,
      });

      const stream = anthropic.messages.stream({
        model: modelId,
        max_tokens: 8192,
        system:
          systemPrompt +
          "\n\nIMPORTANT: Output ONLY a valid JSON object. No markdown, no code fences, no explanation — just raw JSON.",
        messages: [{ role: "user", content: userMessage }],
      });

      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Anthropic sometimes wraps output in ```json ... ``` even when
            // told not to. Strip the leading code fence by buffering until we
            // see the first '{', then strip any trailing fence from the tail.
            let jsonStarted = false;
            let tailBuffer = ""; // holds last N chars to detect trailing fence
            const TAIL_SIZE = 16; // larger than "```" + surrounding whitespace

            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                const text = event.delta.text;

                if (!jsonStarted) {
                  tailBuffer += text;
                  const jsonStart = tailBuffer.indexOf("{");
                  if (jsonStart !== -1) {
                    jsonStarted = true;
                    tailBuffer = tailBuffer.slice(jsonStart);
                    // fall through to the emit logic below
                  } else {
                    continue; // still in preamble, keep buffering
                  }
                } else {
                  tailBuffer += text;
                }

                // Emit everything except the last TAIL_SIZE chars
                if (tailBuffer.length > TAIL_SIZE) {
                  const safe = tailBuffer.slice(0, tailBuffer.length - TAIL_SIZE);
                  controller.enqueue(encoder.encode(safe));
                  tailBuffer = tailBuffer.slice(tailBuffer.length - TAIL_SIZE);
                }
              }
            }

            // Flush: strip trailing code fence / whitespace, then emit the rest
            const flushed = tailBuffer.replace(/\s*```\s*$/, "").trimEnd();
            if (flushed) controller.enqueue(encoder.encode(flushed));

            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      trackEvent({ userId: user.id, eventType: "resume_generated", model: modelId });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
        },
      });
    }

    // ── OpenAI ──────────────────────────────────────────────────────────────
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const stream = await openai.chat.completions.create({
      model: modelId,
      stream: true,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    trackEvent({ userId: user.id, eventType: "resume_generated", model: modelId });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Tailor API error:", error);
    trackApiError({
      route: "/api/tailor",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500,
      userId: user.id,
    });
    return new Response(JSON.stringify({ error: "Failed to tailor resume" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
