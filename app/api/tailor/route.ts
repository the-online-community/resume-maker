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

    const systemPrompt = hasRealData
      ? `You are a professional resume writer. Your job is to create a tailored resume from the user's profile data${hasResumes ? " and resume(s)" : ""}, optimized for a specific job description.

CRITICAL RULES:
- ONLY use information that exists in the user's profile${hasResumes ? " and resumes" : ""}. DO NOT fabricate skills, experiences, companies, degrees, or qualifications.
- You may reword, restructure, and reorder content to better match the job description.
- You may emphasize relevant skills and experience that the user actually has.
- You may adjust phrasing to use keywords from the job description where they truthfully apply.
- DO NOT add skills the user doesn't have. DO NOT invent work experience.
- Use REAL data from the user's profile for contact info, experience, education, skills, and languages — NEVER use placeholders like "[Company Name]" when real data is available.

PAGE LENGTH TARGET: ${targetPages} page${targetPages > 1 ? "s" : ""}.
${targetPages === 1 ? "Keep the resume concise — aim for content that fits on a single US Letter page. Use exactly 2 bullet points per role, a brief but impactful summary, and only the most relevant skills using smart selection." : "Fill 2 full pages — expand to 3-4 bullet points per role, elaborate on achievements with more detail, include a longer summary, and list more skills. Include all relevant roles from the user's experience."}

Output a JSON object with these exact keys: ${placeholderList}

Guidelines for each field:
- FULL_NAME: Use the user's real name from their profile${hasResumes ? " or resume(s)" : ""}
- JOB_TITLE: A concise professional title tailored to the job description (e.g. "Frontend Engineer", "Full Stack Developer", "Senior React Developer")
- EMAIL: Use the user's real email from their profile${hasResumes ? " or resume(s)" : ""}
- PHONE: Use the user's real phone from their profile${hasResumes ? " or resume(s)" : ""}
- LOCATION: Use the user's real location from their profile${hasResumes ? " or resume(s)" : ""}
- LINKEDIN: Use the user's real LinkedIn URL from their profile, or empty string if not available
- GITHUB: Use the user's real GitHub URL from their profile, or empty string if not available
- WEBSITE: Use the user's real website URL from their profile, or empty string if not available
- SUMMARY: 2-3 sentence professional summary that directly addresses the job description. IMPORTANT: Do NOT mention specific company names, project names, or institution names in the summary — keep it generalized. The summary MUST always start with the candidate's years of experience if provided in the profile (e.g. "Software engineer with 8+ years of experience..." or "Results-driven frontend developer with 8+ years of experience..."). Use the EXACT number from the "Total Years of Experience" field with a "+" suffix — do NOT guess or calculate from job dates. Focus on years of experience, domain expertise, core technical skills, and key strengths/abilities that align with the JD. You may reference general achievements and impact (e.g. "with a track record of building high-performance web applications") but never tie them to a specific employer or project by name.
- EXPERIENCE: Use the user's REAL experience from their profile — real job titles, real company names, real locations, and real dates. Format as a string with each role separated by newlines: Job Title | Company | Location | StartYear – EndYear (use years only, no months), followed by exactly 2 bullet points per role. IMPORTANT: Each experience role may have LINKED PROJECTS listed under it in the profile context (marked with →). The bullet points for that role MUST be derived from those linked projects' highlights, descriptions, and stack. This is how the user maps their work to each job — respect these assignments. Each bullet point MUST:
  (1) Align directly with the job description requirements
  (2) Lead with a strong action verb
  (3) Draw from the LINKED PROJECTS' highlights for that specific role — use the REAL metrics and achievements they provided (e.g. "Reduced page load time by 40%", "Attracted 100,000+ visitors"). If no metrics exist, describe the impact qualitatively — do NOT invent numbers or use [X] placeholders.
  (4) Incorporate relevant keywords from the JD naturally
  If a role has no linked projects, draw from general context to write grounded bullets.
- EDUCATION: Use the user's REAL education from their profile. Format each entry on its own line: Degree, Institution | StartYear – EndYear. If an education entry has an achievement (e.g. GPA, honors, Dean's List), include it on the next line below the institution, like: "Highest Overall GPA: 3.6" or "Magna Cum Laude". Only include achievements that exist in the profile — do not add them if the user didn't provide any.
- SKILLS: A comma-separated list with a comma AND a space between each skill (e.g. "JavaScript, TypeScript, React, Node.js"). Use smart skill selection — do NOT dump all skills. Follow these rules:
  (1) ALWAYS include foundational/mandatory skills that hold high value (e.g. JavaScript, TypeScript, HTML, CSS, Python, Node.js, React, SQL — the staples of the user's field)
  (2) Include specialized/niche skills (e.g. Zod, React Hook Form, Prisma, Tailwind CSS, tRPC) ONLY if they appear in or are relevant to the job description
  (3) Order skills by relevance to the job description — most relevant first
  (4) Keep the list focused and ATS-optimized — quality over quantity
- LANGUAGES: If the user has languages in their profile, list them as a comma-separated list with a comma AND a space between each (e.g. "English (Native), Arabic (Native), French (Intermediate)"). Include the proficiency level in parentheses.
- CERTIFICATIONS: If present in the user's profile${hasResumes ? " or resume" : ""}, list them. Otherwise empty string.
- _COMPANY_NAME: Extract the hiring company's name from the job description. If the company name is not mentioned, use "[Company Name]".

Keep all content professional and concise. Optimize for ATS (Applicant Tracking System) compatibility.${profileContext}${templateInstructions}${customPrompt ? `\n\nADDITIONAL USER INSTRUCTIONS:\n${customPrompt}` : ""}`
      : `You are a professional resume writer. The user has NOT provided profile data or a resume. Your job is to generate a well-structured resume draft tailored to the given job description.

You know the user's name${userEmail ? " and email" : ""}. Use this information and create a professional resume that:
- Has a strong professional summary tailored to the job description
- Includes realistic, well-structured PLACEHOLDER experience entries that match the job requirements. Use "[Company Name]" and "[City, State]" as placeholders for company and location. Use "[Start Date] – [End Date]" for dates.
- Lists relevant skills extracted from the job description requirements
- Includes a placeholder education entry: "[Degree], [University] | [Year]"
- Uses action verbs and quantified achievements in bullet points (with [X] as number placeholders)

The user will fill in their real details afterward — your job is to give them a polished, ATS-optimized starting point.

PAGE LENGTH TARGET: ${targetPages} page${targetPages > 1 ? "s" : ""}.
${targetPages === 1 ? "Keep the resume concise — aim for content that fits on a single US Letter page. Use exactly 2 bullet points per role, a brief but impactful summary, and only the most relevant skills." : "Fill 2 full pages — expand to 3-4 bullet points per role, elaborate on achievements with more detail, include a longer summary, and list more skills and certifications."}

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
- EXPERIENCE: Formatted as a string with 2-3 placeholder roles relevant to the job. For each role: Job Title | [Company Name] | [City, State] | [StartYear] – [EndYear] (use years only, no months), followed by exactly 2 bullet points per role with quantified achievements using [X] placeholders. Each bullet should align with JD requirements and lead with a strong action verb.
- EDUCATION: "[Degree], [University] | [Year]"
- SKILLS: Comma-separated list with a comma AND a space between each skill (e.g. "JavaScript, TypeScript, React, Node.js"). Include skills from the job description requirements, ordered by relevance.
- LANGUAGES: Empty string
- CERTIFICATIONS: Empty string
- _COMPANY_NAME: Extract the hiring company's name from the job description. If the company name is not mentioned, use "[Company Name]".

Keep all content professional and concise. Optimize for ATS compatibility.${profileContext}${templateInstructions}${customPrompt ? `\n\nADDITIONAL USER INSTRUCTIONS:\n${customPrompt}` : ""}`;

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
