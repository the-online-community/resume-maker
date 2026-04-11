import { NextResponse } from "next/server";

import { isErrorResponse, safeJson, sanitizeUrl } from "@/lib/api/sanitize";
import { getAuthClient } from "@/lib/supabase/server";

/**
 * POST /api/extract-job
 * Fetches a LinkedIn job URL and extracts the job description as plain text.
 *
 * Input:  { url: string }
 * Output: { title, company, location, description }
 */

const LINKEDIN_JOB_VIEW = /linkedin\.com\/jobs\/view\//i;
const CURRENT_JOB_ID = /currentJobId=(\d+)/i;
const LINKEDIN_JOBS_URL = /linkedin\.com\/jobs\//i;

function normalizeLinkedInUrl(raw: string): string | null {
  // Already a /jobs/view/ URL
  if (LINKEDIN_JOB_VIEW.test(raw)) return raw;

  // Any LinkedIn /jobs/ URL with currentJobId param → convert to /jobs/view/:id
  const match = raw.match(CURRENT_JOB_ID);
  if (match?.[1]) {
    return `https://www.linkedin.com/jobs/view/${match[1]}`;
  }

  // Any other LinkedIn jobs URL (e.g. /jobs/collections/..., /jobs/search/...)
  if (LINKEDIN_JOBS_URL.test(raw)) {
    // Try to extract a numeric job ID from the path
    const pathIdMatch = raw.match(/\/jobs\/[^?]*?(\d{5,})/);
    if (pathIdMatch?.[1]) {
      return `https://www.linkedin.com/jobs/view/${pathIdMatch[1]}`;
    }
  }

  return null;
}

export async function POST(req: Request) {
  const { user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await safeJson<{ url?: string }>(req);
  if (isErrorResponse(parsed)) return parsed;

  try {
    const url = sanitizeUrl(parsed.url);
    if (!url) {
      return NextResponse.json({ error: "A valid URL is required" }, { status: 400 });
    }

    const jobUrl = normalizeLinkedInUrl(url);
    if (!jobUrl) {
      return NextResponse.json(
        { error: "Only LinkedIn job URLs are supported" },
        { status: 400 },
      );
    }

    // Fetch the LinkedIn page with a browser-like User-Agent
    const res = await fetch(jobUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL (${res.status})` },
        { status: 502 },
      );
    }

    const html = await res.text();

    // ── Extract structured data ──

    // Title: <h1> or og:title
    const titleMatch =
      html.match(/<h1[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
      html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) ||
      html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim().replace(/ \| LinkedIn$/, "") || "";

    // Company
    const companyMatch =
      html.match(/<a[^>]*class="[^"]*topcard__org-name-link[^"]*"[^>]*>([^<]+)<\/a>/i) ||
      html.match(/<a[^>]*class="[^"]*top-card-layout__company-url[^"]*"[^>]*>\s*([^<]+?)\s*<\/a>/i) ||
      html.match(/class="[^"]*company-name[^"]*"[^>]*>([^<]+)</i);
    const company = companyMatch?.[1]?.trim() || "";

    // Location
    const locationMatch =
      html.match(/<span[^>]*class="[^"]*topcard__flavor--bullet[^"]*"[^>]*>([^<]+)<\/span>/i) ||
      html.match(/<span[^>]*class="[^"]*top-card-layout__bullet[^"]*"[^>]*>([^<]+)<\/span>/i);
    const location = locationMatch?.[1]?.trim() || "";

    // Description: the main job description block
    const descMatch =
      html.match(/<div[^>]*class="[^"]*show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<div[^>]*class="[^"]*description__text[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<section[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/section>/i);

    let description = "";
    if (descMatch?.[1]) {
      description = descMatch[1]
        // Convert <br> and block tags to newlines
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
        .replace(/<li[^>]*>/gi, "• ")
        // Strip remaining HTML tags
        .replace(/<[^>]+>/g, "")
        // Decode common HTML entities
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        // Clean up whitespace
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    if (!description) {
      return NextResponse.json(
        { error: "Could not extract job description from this page" },
        { status: 422 },
      );
    }

    // Build a formatted plain-text block for the editor
    const parts = [
      title && `${title}`,
      company && `Company: ${company}`,
      location && `Location: ${location}`,
      "",
      description,
    ].filter((p) => p !== undefined);

    return NextResponse.json({
      title,
      company,
      location,
      description,
      fullText: parts.join("\n"),
    });
  } catch (err) {
    console.error("extract-job error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
