/**
 * AdapterRegistry — a Map-based registry for source adapters.
 *
 * Provides O(1) lookup of SourceAdapter instances by their sourceType string.
 * Used by the webhook handler to route incoming payloads to the correct adapter.
 */

import { SourceAdapter } from "./types.js"

export class AdapterRegistry {
  private adapters: Map<string, SourceAdapter> = new Map()

  /**
   * Register a source adapter. The adapter is keyed by its `sourceType` property.
   * If an adapter with the same sourceType is already registered, it is replaced.
   */
  register(adapter: SourceAdapter): void {
    this.adapters.set(adapter.sourceType, adapter)
  }

  /**
   * Look up an adapter by source type.
   * Returns `undefined` if no adapter is registered for the given type.
   */
  get(sourceType: string): SourceAdapter | undefined {
    return this.adapters.get(sourceType)
  }

  /** Check whether an adapter is registered for the given source type. */
  has(sourceType: string): boolean {
    return this.adapters.has(sourceType)
  }
}
