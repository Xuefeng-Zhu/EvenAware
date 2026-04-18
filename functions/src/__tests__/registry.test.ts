/**
 * Unit tests for the AdapterRegistry.
 *
 * Validates: Requirements 2.2, 2.3
 */

import { AdapterRegistry } from "../adapters/registry"
import { SourceAdapter, ParsedNotification } from "../adapters/types"

/** Minimal stub adapter for testing registry operations. */
function createStubAdapter(sourceType: string): SourceAdapter {
  return {
    sourceType,
    parse(_raw: unknown): ParsedNotification {
      return {
        title: "stub",
        body: "",
        severity: "info",
        sourceName: "Stub",
        sourceType,
      }
    },
  }
}

describe("AdapterRegistry", () => {
  let registry: AdapterRegistry

  beforeEach(() => {
    registry = new AdapterRegistry()
  })

  it("registers and retrieves a known adapter", () => {
    const adapter = createStubAdapter("test-source")
    registry.register(adapter)

    const result = registry.get("test-source")
    expect(result).toBe(adapter)
  })

  it("returns undefined for an unknown source type", () => {
    expect(registry.get("nonexistent")).toBeUndefined()
  })

  it("has() returns true for a registered type", () => {
    registry.register(createStubAdapter("pagerduty"))
    expect(registry.has("pagerduty")).toBe(true)
  })

  it("has() returns false for an unregistered type", () => {
    expect(registry.has("unknown")).toBe(false)
  })
})
