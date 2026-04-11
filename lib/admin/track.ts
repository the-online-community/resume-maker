import { createAdminClient } from "./auth";

export type EventType =
  | "resume_generated"
  | "pdf_downloaded"
  | "job_analyzed"
  | "score_checked";

/**
 * Fire-and-forget event tracking. Never blocks the caller.
 */
export function trackEvent(params: {
  userId: string;
  eventType: EventType;
  model?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    admin
      .from("analytics_events")
      .insert({
        user_id: params.userId,
        event_type: params.eventType,
        model: params.model ?? null,
        metadata: params.metadata ?? {},
      })
      .then(({ error }) => {
        if (error) console.error("[track] event insert error:", error.message);
      });
  } catch (err) {
    console.error("[track] unexpected error:", err);
  }
}

/**
 * Fire-and-forget API error tracking.
 */
export function trackApiError(params: {
  route: string;
  errorMessage: string;
  statusCode: number;
  userId?: string;
  model?: string;
}) {
  try {
    const admin = createAdminClient();
    admin
      .from("api_errors")
      .insert({
        route: params.route,
        error_message: params.errorMessage,
        status_code: params.statusCode,
        user_id: params.userId ?? null,
        model: params.model ?? null,
      })
      .then(({ error }) => {
        if (error) console.error("[track] error insert error:", error.message);
      });
  } catch (err) {
    console.error("[track] unexpected error:", err);
  }
}
