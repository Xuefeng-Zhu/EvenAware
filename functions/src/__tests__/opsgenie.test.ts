/**
 * Unit tests for the OpsGenie source adapter.
 *
 * Validates: Requirements 2.4, 2.5
 */

import { opsGenieAdapter } from "../adapters/opsgenie"

/** Helper to build a valid OpsGenie webhook payload. */
function buildPayload(overrides: Record<string, unknown> = {}) {
  const base = {
    alert: {
      message: "Disk usage above 90% on db-primary",
      description: "The disk on db-primary has exceeded 90% capacity.",
      priority: "P1",
      source: "Monitoring Service",
    },
  }
  return { ...base, ...overrides }
}

describe("OpsGenie adapter", () => {
  it("has sourceType 'opsgenie'", () => {
    expect(opsGenieAdapter.sourceType).toBe("opsgenie")
  })

  // --- Priority → severity mapping ---

  it("maps P1 priority to severity critical", () => {
    const result = opsGenieAdapter.parse(buildPayload())
    expect(result.severity).toBe("critical")
  })

  it("maps P2 priority to severity critical", () => {
    const payload = buildPayload({
      alert: { message: "Alert", priority: "P2" },
    })
    const result = opsGenieAdapter.parse(payload)
    expect(result.severity).toBe("critical")
  })

  it("maps P3 priority to severity warning", () => {
    const payload = buildPayload({
      alert: { message: "Alert", priority: "P3" },
    })
    const result = opsGenieAdapter.parse(payload)
    expect(result.severity).toBe("warning")
  })

  it("maps P4 priority to severity info", () => {
    const payload = buildPayload({
      alert: { message: "Alert", priority: "P4" },
    })
    const result = opsGenieAdapter.parse(payload)
    expect(result.severity).toBe("info")
  })

  it("maps P5 priority to severity info", () => {
    const payload = buildPayload({
      alert: { message: "Alert", priority: "P5" },
    })
    const result = opsGenieAdapter.parse(payload)
    expect(result.severity).toBe("info")
  })

  it("defaults severity to info when priority is missing", () => {
    const payload = buildPayload({
      alert: { message: "No priority alert" },
    })
    const result = opsGenieAdapter.parse(payload)
    expect(result.severity).toBe("info")
  })

  // --- Field extraction ---

  it("extracts title, body, sourceName, and sourceType from a valid payload", () => {
    const result = opsGenieAdapter.parse(buildPayload())
    expect(result).toEqual({
      title: "Disk usage above 90% on db-primary",
      body: "The disk on db-primary has exceeded 90% capacity.",
      severity: "critical",
      sourceName: "Monitoring Service",
      sourceType: "opsgenie",
    })
  })

  it("defaults body to empty string when description is missing", () => {
    const payload = buildPayload({
      alert: { message: "No desc", priority: "P3" },
    })
    const result = opsGenieAdapter.parse(payload)
    expect(result.body).toBe("")
  })

  it("defaults sourceName to 'OpsGenie' when source is missing", () => {
    const payload = buildPayload({
      alert: { message: "No source", priority: "P1" },
    })
    const result = opsGenieAdapter.parse(payload)
    expect(result.sourceName).toBe("OpsGenie")
  })

  // --- Malformed payloads ---

  it("throws on non-object payload", () => {
    expect(() => opsGenieAdapter.parse("string")).toThrow()
    expect(() => opsGenieAdapter.parse(null)).toThrow()
    expect(() => opsGenieAdapter.parse(123)).toThrow()
  })

  it("throws when alert field is missing", () => {
    expect(() => opsGenieAdapter.parse({})).toThrow("alert")
  })

  it("throws when alert.message is missing", () => {
    expect(() =>
      opsGenieAdapter.parse({ alert: { priority: "P1" } })
    ).toThrow("message")
  })
})
