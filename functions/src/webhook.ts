/**
 * Webhook handler Cloud Function for the Notification Hub.
 *
 * Receives HTTP POST requests at /webhooks/:sourceType, validates auth,
 * routes to the matching source adapter, normalizes the parsed notification,
 * and writes it to the Firestore `notifications` collection.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 13.1
 */

import { onRequest } from "firebase-functions/v2/https"
import * as admin from "firebase-admin"
import * as logger from "firebase-functions/logger"
import { AdapterRegistry } from "./adapters/registry.js"
import { pagerDutyAdapter } from "./adapters/pagerduty.js"
import { opsGenieAdapter } from "./adapters/opsgenie.js"

/** Maximum allowed length for notification titles. */
const MAX_TITLE_LENGTH = 120

/** Maximum allowed length for notification bodies. */
const MAX_BODY_LENGTH = 400

/** Valid severity values. */
const VALID_SEVERITIES = new Set(["critical", "warning", "info"])

/** Maximum length of sanitized payload excerpt for error logging. */
const PAYLOAD_EXCERPT_LENGTH = 200

// Initialize Firebase Admin SDK (idempotent — safe to call multiple times)
if (admin.apps.length === 0) {
  admin.initializeApp()
}

const db = admin.firestore()

// Set up the adapter registry with built-in adapters
const registry = new AdapterRegistry()
registry.register(pagerDutyAdapter)
registry.register(opsGenieAdapter)

/**
 * Validate the Authorization header against the configured webhook token.
 * Returns true if the token is valid, false otherwise.
 */
function validateAuthToken(authHeader: string | undefined): boolean {
  const expectedToken = process.env.WEBHOOK_AUTH_TOKEN
  if (!expectedToken) {
    // If no token is configured, reject all requests for safety
    logger.warn("WEBHOOK_AUTH_TOKEN environment variable is not set")
    return false
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false
  }

  const token = authHeader.slice("Bearer ".length)
  return token === expectedToken
}

/**
 * Truncate a string to the specified maximum length.
 */
function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }
  return value.slice(0, maxLength)
}

/**
 * HTTP-triggered Cloud Function: POST /webhooks/:sourceType
 *
 * 1. Validates auth token from Authorization: Bearer <token> header
 * 2. Looks up adapter by req.params.sourceType
 * 3. Calls adapter.parse(req.body)
 * 4. Normalizes: truncates title/body, validates severity, adds server timestamp
 * 5. Writes to Firestore notifications collection
 * 6. Responds with HTTP 200
 */
export const handleWebhook = onRequest(async (req, res) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." })
    return
  }

  // 1. Validate auth token
  const authHeader = req.headers.authorization
  if (!validateAuthToken(authHeader)) {
    res.status(401).json({ error: "Invalid or missing authentication token" })
    return
  }

  // Extract sourceType from the URL path: /webhooks/:sourceType
  // Cloud Functions v2 uses req.path, so we parse the sourceType from it
  const pathParts = req.path.split("/").filter(Boolean)
  // Expected path: /webhooks/:sourceType → ["webhooks", ":sourceType"]
  if (pathParts.length < 2 || pathParts[0] !== "webhooks") {
    res.status(404).json({ error: "Invalid path. Expected /webhooks/:sourceType" })
    return
  }
  const sourceType = pathParts[1]

  // 2. Look up adapter
  const adapter = registry.get(sourceType)
  if (!adapter) {
    res.status(404).json({ error: `No adapter registered for source type: ${sourceType}` })
    return
  }

  // 3. Parse the payload via the adapter
  let parsed
  try {
    parsed = adapter.parse(req.body)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const payloadExcerpt = JSON.stringify(req.body).slice(0, PAYLOAD_EXCERPT_LENGTH)
    logger.error("Adapter parse error", {
      sourceType,
      error: message,
      payloadExcerpt,
    })
    res.status(422).json({ error: `Failed to parse payload: ${message}` })
    return
  }

  // 4. Normalize the parsed notification
  const title = truncate(parsed.title, MAX_TITLE_LENGTH)
  const body = truncate(parsed.body, MAX_BODY_LENGTH)
  const severity = VALID_SEVERITIES.has(parsed.severity) ? parsed.severity : "info"

  const notificationData = {
    title,
    body,
    severity,
    sourceName: parsed.sourceName,
    sourceType: parsed.sourceType,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  }

  // 5. Write to Firestore with auto-generated ID
  try {
    await db.collection("notifications").add(notificationData)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("Firestore write error", { sourceType, error: message })
    res.status(500).json({ error: "Failed to write notification to database" })
    return
  }

  // 6. Respond with HTTP 200
  res.status(200).json({ success: true })
})
