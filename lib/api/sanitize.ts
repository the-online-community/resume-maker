import { NextResponse } from "next/server";

// ── Size limits (bytes / chars) ─────────────────────────────────────────────
export const MAX_JSON_BODY = 512 * 1024; // 512 KB
export const MAX_JOB_DESCRIPTION = 50_000; // chars
export const MAX_RESUME_TEXT = 100_000; // chars
export const MAX_SHORT_TEXT = 2_000; // chars (notes, reasons, etc.)
export const MAX_URL = 2_048; // chars
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// ── Safe JSON parsing ───────────────────────────────────────────────────────

/**
 * Safely parse request JSON. Returns the parsed body or a 400 Response.
 * Also enforces a body size limit via Content-Length when available.
 */
export async function safeJson<T = unknown>(
  request: Request,
  maxSize = MAX_JSON_BODY,
): Promise<T | NextResponse> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxSize) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 },
    );
  }

  try {
    return (await request.json()) as T;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }
}

/** Type guard: true when safeJson returned an error response. */
export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

// ── String sanitization ─────────────────────────────────────────────────────

/** Trim, collapse whitespace, strip HTML tags, and enforce max length. */
export function sanitizeString(
  input: unknown,
  maxLength = MAX_SHORT_TEXT,
): string {
  if (typeof input !== "string") return "";
  return input
    .trim()
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "") // strip control chars (keep \n, \r, \t)
    .slice(0, maxLength);
}

/** Validate and sanitize a URL string. Returns the cleaned URL or empty string. */
export function sanitizeUrl(input: unknown, maxLength = MAX_URL): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim().slice(0, maxLength);
  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

// ── CSRF protection ─────────────────────────────────────────────────────────

import { NEXT_PUBLIC_APP_URL } from "@/lib/env";

const ALLOWED_ORIGINS = new Set([
  NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "https://resume-maker.collegeofdawn.com",
].filter(Boolean));

/**
 * Verify the request originates from our own site by checking the Origin
 * (or Referer) header. Returns a 403 response if the check fails,
 * or null if the request is legitimate.
 */
export function checkCsrf(request: Request): NextResponse | null {
  const origin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!origin) {
    // No origin header — could be a server-to-server call or same-origin
    // navigation. Allow it; the auth layer is the real gate.
    return null;
  }

  try {
    const url = new URL(origin);
    if (ALLOWED_ORIGINS.has(url.origin)) return null;
  } catch {
    // Malformed origin header
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Assert a value is a non-empty string after trimming. */
export function requireString(
  input: unknown,
  fieldName: string,
): string | NextResponse {
  if (typeof input !== "string" || !input.trim()) {
    return NextResponse.json(
      { error: `Missing required field: ${fieldName}` },
      { status: 400 },
    );
  }
  return input.trim();
}
