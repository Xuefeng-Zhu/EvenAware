/**
 * OpsGenie source adapter for the Notification Hub.
 *
 * Parses OpsGenie webhook alert payloads into ParsedNotification objects.
 * Maps alert priority levels to severity:
 *   - P1, P2 → critical
 *   - P3     → warning
 *   - P4, P5 → info
 *   - (any other or missing) → info
 *
 * Requirements: 2.4, 2.5
 */

import { SourceAdapter, ParsedNotification } from "./types.js"

/** Maps OpsGenie alert priorities to notification severity levels. */
const PRIORITY_SEVERITY: Record<string, string> = {
  P1: "critical",
  P2: "critical",
  P3: "warning",
  P4: "info",
  P5: "info",
}

export const opsGenieAdapter: SourceAdapter = {
  sourceType: "opsgenie",

  parse(rawPayload: unknown): ParsedNotification {
    if (typeof rawPayload !== "object" || rawPayload === null) {
      throw new Error("OpsGenie payload must be a non-null object")
    }

    const payload = rawPayload as Record<string, unknown>
    const alert = payload.alert

    if (typeof alert !== "object" || alert === null) {
      throw new Error("OpsGenie payload missing required 'alert' field")
    }

    const alertObj = alert as Record<string, unknown>
    const message = alertObj.message

    if (typeof message !== "string") {
      throw new Error("OpsGenie payload missing required 'alert.message' string field")
    }

    const body = typeof alertObj.description === "string" ? alertObj.description : ""

    const sourceName =
      typeof alertObj.source === "string" ? alertObj.source : "OpsGenie"

    const priority = typeof alertObj.priority === "string" ? alertObj.priority : ""
    const severity = PRIORITY_SEVERITY[priority] ?? "info"

    return {
      title: message,
      body,
      severity,
      sourceName,
      sourceType: "opsgenie",
    }
  },
}
