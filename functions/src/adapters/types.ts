/**
 * Adapter types for the Notification Hub webhook ingestion pipeline.
 *
 * Defines the SourceAdapter interface that each notification source must
 * implement, and the ParsedNotification shape returned by adapters before
 * backend normalization (truncation, severity validation, timestamp).
 */

/**
 * Output of a source adapter's parse method, before backend normalization.
 * The webhook handler will truncate fields, validate severity, and add
 * id + server timestamp after receiving this from an adapter.
 */
export interface ParsedNotification {
  title: string
  body: string
  severity: string
  sourceName: string
  sourceType: string
}

/**
 * Interface that every notification source adapter must implement.
 *
 * Each adapter is responsible for parsing a specific source's raw webhook
 * payload into a normalized ParsedNotification. The adapter is registered
 * in the AdapterRegistry keyed by its `sourceType`, which must match the
 * `:sourceType` URL parameter used in the webhook endpoint.
 */
export interface SourceAdapter {
  /** Unique identifier matching the :sourceType URL parameter */
  readonly sourceType: string

  /**
   * Parse a raw webhook payload into a ParsedNotification.
   * Throws if the payload is malformed or missing required fields.
   */
  parse(rawPayload: unknown): ParsedNotification
}
