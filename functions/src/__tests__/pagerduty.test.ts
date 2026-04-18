/**
 * Unit tests for the PagerDuty source adapter.
 *
 * Validates: Requirements 2.4, 2.5
 */

import { pagerDutyAdapter } from "../adapters/pagerduty"

/** Helper to build a valid PagerDuty V2 webhook payload. */
function buildPayload(overrides: Record<string, unknown> = {}) {
  const base = {
    event: {
      event_type: "incident.trigger",
      data: {
        title: "CPU usage exceeded 95% on prod-web-01",
        description: "The CPU usage on prod-web-01 has been above 95% for 5 minutes.",
        service: { name: "Production Web" },
      },
    },
  }
  return { ...base, ...overrides }
}

describe("PagerDuty adapter", () => {
  it("has sourceType 'pagerduty'", () => {
    expect(pagerDutyAdapter.sourceType).toBe("pagerduty")
  })

  // --- Severity mapping ---

  it("maps incident.trigger to severity critical", () => {
    const result = pagerDutyAdapter.parse(buildPayload())
    expect(result.severity).toBe("critical")
  })

  it("maps incident.acknowledge to severity warning", () => {
    const payload = buildPayload({
      event: {
        event_type: "incident.acknowledge",
        data: { title: "Acknowledged", service: { name: "Svc" } },
      },
    })
    const result = pagerDutyAdapter.parse(payload)
    expect(result.severity).toBe("warning")
  })

  it("maps incident.resolve to severity info", () => {
    const payload = buildPayload({
      event: {
        event_type: "incident.resolve",
        data: { title: "Resolved", service: { name: "Svc" } },
      },
    })
    const result = pagerDutyAdapter.parse(payload)
    expect(result.severity).toBe("info")
  })

  it("maps unknown event type to severity info", () => {
    const payload = buildPayload({
      event: {
        event_type: "incident.unknown_action",
        data: { title: "Something", service: { name: "Svc" } },
      },
    })
    const result = pagerDutyAdapter.parse(payload)
    expect(result.severity).toBe("info")
  })

  // --- Field extraction ---

  it("extracts title, body, sourceName, and sourceType from a valid payload", () => {
    const result = pagerDutyAdapter.parse(buildPayload())
    expect(result).toEqual({
      title: "CPU usage exceeded 95% on prod-web-01",
      body: "The CPU usage on prod-web-01 has been above 95% for 5 minutes.",
      severity: "critical",
      sourceName: "Production Web",
      sourceType: "pagerduty",
    })
  })

  it("defaults body to empty string when description is missing", () => {
    const payload = buildPayload({
      event: {
        event_type: "incident.trigger",
        data: { title: "No description", service: { name: "Svc" } },
      },
    })
    const result = pagerDutyAdapter.parse(payload)
    expect(result.body).toBe("")
  })

  it("defaults sourceName to 'PagerDuty' when service.name is missing", () => {
    const payload = buildPayload({
      event: {
        event_type: "incident.trigger",
        data: { title: "No service", description: "desc" },
      },
    })
    const result = pagerDutyAdapter.parse(payload)
    expect(result.sourceName).toBe("PagerDuty")
  })

  // --- Malformed payloads ---

  it("throws on non-object payload", () => {
    expect(() => pagerDutyAdapter.parse("not an object")).toThrow()
    expect(() => pagerDutyAdapter.parse(null)).toThrow()
    expect(() => pagerDutyAdapter.parse(42)).toThrow()
  })

  it("throws when event field is missing", () => {
    expect(() => pagerDutyAdapter.parse({})).toThrow("event")
  })

  it("throws when event.data is missing", () => {
    expect(() =>
      pagerDutyAdapter.parse({ event: { event_type: "incident.trigger" } })
    ).toThrow("data")
  })

  it("throws when event.data.title is missing", () => {
    expect(() =>
      pagerDutyAdapter.parse({
        event: { event_type: "incident.trigger", data: {} },
      })
    ).toThrow("title")
  })

  it("throws when event.event_type is missing", () => {
    expect(() =>
      pagerDutyAdapter.parse({
        event: { data: { title: "Has title" } },
      })
    ).toThrow("event_type")
  })
})
