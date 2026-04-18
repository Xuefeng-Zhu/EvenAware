/**
 * PagerDuty source adapter for the Notification Hub.
 *
 * Parses PagerDuty V2 webhook event payloads into ParsedNotification objects.
 * Maps incident event types to severity levels:
 *   - incident.trigger   → critical
 *   - incident.acknowledge → warning
 *   - incident.resolve   → info
 *   - (any other)        → info
 *
 * Requirements: 2.4, 2.5
 */

import { SourceAdapter, ParsedNotification } from "./types.js"

/** Maps PagerDuty event types to notification severity levels. */
const EVENT_TYPE_SEVERITY: Record<string, string> = {
  "incident.trigger": "critical",
  "incident.acknowledge": "warning",
  "incident.resolve": "info",
}

export const pagerDutyAdapter: SourceAdapter = {
  sourceType: "pagerduty",

  parse(rawPayload: unknown): ParsedNotification {
    if (typeof rawPayload !== "object" || rawPayload === null) {
      throw new Error("PagerDuty payload must be a non-null object")
    }

    const payload = rawPayload as Record<string, unknown>
    const event = payload.event

    if (typeof event !== "object" || event === null) {
      throw new Error("PagerDuty payload missing required 'event' field")
    }

    const eventObj = event as Record<string, unknown>
    const eventType = eventObj.event_type

    if (typeof eventType !== "string") {
      throw new Error("PagerDuty payload missing required 'event.event_type' string field")
    }

    const data = eventObj.data

    if (typeof data !== "object" || data === null) {
      throw new Error("PagerDuty payload missing required 'event.data' field")
    }

    const dataObj = data as Record<string, unknown>
    const title = dataObj.title

    if (typeof title !== "string") {
      throw new Error("PagerDuty payload missing required 'event.data.title' string field")
    }

    const body = typeof dataObj.description === "string" ? dataObj.description : ""

    const service = dataObj.service as Record<string, unknown> | undefined
    const sourceName =
      service && typeof service.name === "string" ? service.name : "PagerDuty"

    const severity = EVENT_TYPE_SEVERITY[eventType] ?? "info"

    return {
      title,
      body,
      severity,
      sourceName,
      sourceType: "pagerduty",
    }
  },
}
