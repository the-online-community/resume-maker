import OpenAI from "openai";

interface TailorRequest {
  jobDescription: string;
  resumeTexts: string[];
  placeholders: string[];
  targetPages?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TailorRequest;
    const { jobDescription, resumeTexts, placeholders, targetPages = 1 } = body;

    if (!jobDescription || !resumeTexts.length || !placeholders.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const placeholderList = placeholders.join(", ");

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a professional resume writer. Your job is to create a tailored resume from the user's existing resume data, optimized for a specific job description.

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
- EXPERIENCE: Formatted as a string with each role separated by newlines. For each role include: Job Title at Company | Location | Dates, followed by bullet points. Tailor bullet points to highlight relevance to the job description.
- EDUCATION: Formatted as a string with each entry on its own line: Degree, Institution | Year
- SKILLS: Comma-separated list of skills from the user's resume, ordered by relevance to the job description
- CERTIFICATIONS: If present in the user's resume, list them. Otherwise empty string.

Keep all content professional and concise. Optimize for ATS (Applicant Tracking System) compatibility.`,
        },
        {
          role: "user",
          content: `JOB DESCRIPTION:
${jobDescription}

USER'S RESUME(S):
${resumeTexts.map((text, i) => `--- Resume ${i + 1} ---\n${text}`).join("\n\n")}

Generate the tailored resume data as JSON with these fields: ${placeholderList}`,
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
