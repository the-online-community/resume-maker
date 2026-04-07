import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { MODELS } from "@/lib/models";
import type { UserProfile } from "@/lib/profile";
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
  const enabledFields = new Set(
    templateSettings?.headerFields ?? [
      "EMAIL", "PHONE", "LOCATION", "LINKEDIN", "GITHUB", "WEBSITE",
    ],
  );

  const lines: string[] = [
    "USER PROFILE — always use these exact values; never substitute placeholders:",
  ];

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
  if (profile.skills?.length)
    lines.push(`• Core Skills: ${profile.skills.join(", ")}`);

  if (profile.experience?.length) {
    lines.push("\nBackground Experience (context — tailor bullets around this):");
    for (const e of profile.experience) {
      const dates =
        e.start_date || e.end_date ? ` | ${e.start_date} – ${e.end_date}` : "";
      const loc = e.location ? ` | ${e.location}` : "";
      lines.push(`• ${e.title}${e.company ? ` at ${e.company}` : ""}${loc}${dates}`);
    }
  }

  if (profile.education?.length) {
    lines.push("\nBackground Education:");
    for (const e of profile.education) {
      lines.push(
        `• ${e.degree}${e.institution ? `, ${e.institution}` : ""}${e.year ? ` | ${e.year}` : ""}`,
      );
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

  if (profile.languages?.length) {
    lines.push(
      `\nLanguages: ${profile.languages.map((l) => `${l.language} (${l.proficiency})`).join(", ")}`,
    );
  }

  return lines.join("\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TailorRequest;
    const {
      jobDescription,
      resumeTexts,
      placeholders,
      targetPages = 1,
      userName,
      userEmail,
      customPrompt,
      templateSettings,
      model: modelId = "gpt-5-mini",
      userProfile,
    } = body;

    const hasResumes = resumeTexts && resumeTexts.length > 0;

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

    const systemPrompt = hasResumes
      ? `You are a professional resume writer. Your job is to create a tailored resume from the user's existing resume data, optimized for a specific job description.

CRITICAL RULES:
- ONLY use information that exists in the user's resumes. DO NOT fabricate skills, experiences, companies, degrees, or qualifications.
- You may reword, restructure, and reorder content to better match the job description.
- You may emphasize relevant skills and experience that the user actually has.
- You may adjust phrasing to use keywords from the job description where they truthfully apply.
- DO NOT add skills the user doesn't have. DO NOT invent work experience.

PAGE LENGTH TARGET: ${targetPages} page${targetPages > 1 ? "s" : ""}.
${targetPages === 1 ? "Keep the resume concise — aim for content that fits on a single US Letter page. Use 2-3 bullet points per role, a brief summary, and only list the most relevant skills." : "Fill 2 full pages — expand bullet points to 4-5 per role, elaborate on achievements with more detail, include a longer summary, and list more skills and certifications. Include all relevant roles from the user's experience."}

Output a JSON object with these exact keys: ${placeholderList}

Guidelines for each field:
- FULL_NAME: Extract from the resume(s)
- JOB_TITLE: A concise professional title tailored to the job description (e.g. "Frontend Engineer", "Full Stack Developer", "Senior React Developer")
- EMAIL: Extract from the resume(s)
- PHONE: Extract from the resume(s)
- LOCATION: Extract from the resume(s)
- LINKEDIN: Extract the full LinkedIn profile URL from the resume(s) (e.g. "linkedin.com/in/username"), or empty string if not found
- GITHUB: Extract the full GitHub profile URL from the resume(s) (e.g. "github.com/username"), or empty string if not found
- WEBSITE: Extract personal website/portfolio URL from the resume(s) (e.g. "example.com"), or empty string if not found
- SUMMARY: 2-3 sentence professional summary tailored to the job description, using only the user's real experience
- EXPERIENCE: Formatted as a string with each role separated by newlines. For each role include: Job Title | Company | Location | StartYear – EndYear (use years only, no months), followed by bullet points. Tailor bullet points to highlight relevance to the job description.
- EDUCATION: Formatted as a string with each entry on its own line: Degree, Institution | Year
- SKILLS: Comma-separated list of skills from the user's resume, ordered by relevance to the job description
- CERTIFICATIONS: If present in the user's resume, list them. Otherwise empty string.

Keep all content professional and concise. Optimize for ATS (Applicant Tracking System) compatibility.${profileContext}${templateInstructions}${customPrompt ? `\n\nADDITIONAL USER INSTRUCTIONS:\n${customPrompt}` : ""}`
      : `You are a professional resume writer. The user has NOT uploaded a resume. Your job is to generate a well-structured resume draft tailored to the given job description.

You know the user's name${userEmail ? " and email" : ""}. Use this information and create a professional resume that:
- Has a strong professional summary tailored to the job description
- Includes realistic, well-structured PLACEHOLDER experience entries that match the job requirements. Use "[Company Name]" and "[City, State]" as placeholders for company and location. Use "[Start Date] – [End Date]" for dates.
- Lists relevant skills extracted from the job description requirements
- Includes a placeholder education entry: "[Degree], [University] | [Year]"
- Uses action verbs and quantified achievements in bullet points (with [X] as number placeholders)

The user will fill in their real details afterward — your job is to give them a polished, ATS-optimized starting point.

PAGE LENGTH TARGET: ${targetPages} page${targetPages > 1 ? "s" : ""}.
${targetPages === 1 ? "Keep the resume concise — aim for content that fits on a single US Letter page. Use 2-3 bullet points per role, a brief summary, and only list the most relevant skills." : "Fill 2 full pages — expand bullet points to 4-5 per role, elaborate on achievements with more detail, include a longer summary, and list more skills and certifications."}

Output a JSON object with these exact keys: ${placeholderList}

Guidelines for each field:
- FULL_NAME: Use "${userName || "[Your Name]"}"
- JOB_TITLE: A concise professional title matching the job description
- EMAIL: Use "${userEmail || "[your.email@example.com]"}"
- PHONE: Use "[Your Phone Number]"
- LOCATION: Use "[City, State]"
- LINKEDIN: Use "linkedin.com/in/[username]"
- GITHUB: Use "github.com/[username]" if the role is technical, otherwise empty string
- WEBSITE: Empty string
- SUMMARY: 2-3 sentence professional summary tailored to the job description
- EXPERIENCE: Formatted as a string with 2-3 placeholder roles relevant to the job. For each role: Job Title | [Company Name] | [City, State] | [StartYear] – [EndYear] (use years only, no months), followed by bullet points with quantified achievements using [X] placeholders.
- EDUCATION: "[Degree], [University] | [Year]"
- SKILLS: Comma-separated list of skills from the job description requirements
- CERTIFICATIONS: Empty string

Keep all content professional and concise. Optimize for ATS compatibility.${profileContext}${templateInstructions}${customPrompt ? `\n\nADDITIONAL USER INSTRUCTIONS:\n${customPrompt}` : ""}`;

    const userMessage = hasResumes
      ? `JOB DESCRIPTION:
${jobDescription}

USER'S RESUME(S):
${resumeTexts.map((text, i) => `--- Resume ${i + 1} ---\n${text}`).join("\n\n")}
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
        apiKey: process.env.ANTHROPIC_API_KEY,
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

      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache",
        },
      });
    }

    // ── OpenAI ──────────────────────────────────────────────────────────────
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Tailor API error:", error);
    return new Response(JSON.stringify({ error: "Failed to tailor resume" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
