import OpenAI from "openai";

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

    const placeholderList = placeholders.join(", ");

    // Build template-specific instructions for the AI
    const bulletChar = templateSettings?.bulletStyle === "dash" ? "—" : "•";
    const templateInstructions = templateSettings
      ? `\n\nTEMPLATE SETTINGS:\n- Use "${bulletChar}" as the bullet character for experience bullet points.\n- Only generate these sections: ${templateSettings.sections.join(", ")}. Omit any section not listed.\n- Only include these header/contact fields: ${templateSettings.headerFields.join(", ")}. Leave other contact fields as empty strings.`
      : "";

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      stream: true,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: hasResumes
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

Keep all content professional and concise. Optimize for ATS (Applicant Tracking System) compatibility.${templateInstructions}${customPrompt ? `\n\nADDITIONAL USER INSTRUCTIONS:\n${customPrompt}` : ""}`
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

Keep all content professional and concise. Optimize for ATS compatibility.${templateInstructions}${customPrompt ? `\n\nADDITIONAL USER INSTRUCTIONS:\n${customPrompt}` : ""}`,
        },
        {
          role: "user",
          content: hasResumes
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
Generate a resume draft as JSON with these fields: ${placeholderList}`,
        },
      ],
    });

    // Create a ReadableStream that forwards OpenAI chunks to the client
    const encoder = new TextEncoder();
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
