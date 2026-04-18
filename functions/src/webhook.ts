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

/** Shape of an integration document in the `integrations` Firestore collection. */
export interface IntegrationDoc {
  displayName: string
  sourceType: string
  description: string
  authToken: string
  enabled: boolean
  webhookUrl: string
  createdAt: FirebaseFirestore.Timestamp
}

/**
 * Look up the integration for a given sourceType and validate the bearer token.
 * Returns the integration document if valid, or an error response object.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 5.4
 */
export async function validateIntegrationAuth(
  sourceType: string,
  authHeader: string | undefined
): Promise<
  | { ok: true; integration: IntegrationDoc }
  | { ok: false; status: number; error: string }
> {
  // Query integrations collection for matching sourceType
  const snapshot = await db
    .collection("integrations")
    .where("sourceType", "==", sourceType)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return { ok: false, status: 404, error: `No integration configured for source type: ${sourceType}` }
  }

  const doc = snapshot.docs[0]
  const integration = doc.data() as IntegrationDoc

  if (!integration.enabled) {
    return { ok: false, status: 403, error: "Integration is disabled" }
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing or invalid authorization header" }
  }

  const token = authHeader.slice("Bearer ".length)
  if (token !== integration.authToken) {
    return { ok: false, status: 401, error: "Invalid authentication token" }
  }

  return { ok: true, integration }
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
 * 1. Extracts sourceType from the URL path
 * 2. Validates per-integration auth (Firestore lookup + bearer token check)
 * 3. Looks up adapter by sourceType
 * 4. Calls adapter.parse(req.body)
 * 5. Normalizes: truncates title/body, validates severity, adds server timestamp
 * 6. Writes to Firestore notifications collection
 * 7. Responds with HTTP 200
 */
export const handleWebhook = onRequest(async (req, res) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." })
    return
  }

  // 1. Extract sourceType from the URL path: /webhooks/:sourceType
  // Cloud Functions v2 uses req.path, so we parse the sourceType from it
  const pathParts = req.path.split("/").filter(Boolean)
  // Expected path: /webhooks/:sourceType → ["webhooks", ":sourceType"]
  if (pathParts.length < 2 || pathParts[0] !== "webhooks") {
    res.status(404).json({ error: "Invalid path. Expected /webhooks/:sourceType" })
    return
  }
  const sourceType = pathParts[1]

  // 2. Validate per-integration auth
  const authResult = await validateIntegrationAuth(sourceType, req.headers.authorization)
  if (!authResult.ok) {
    res.status(authResult.status).json({ error: authResult.error })
    return
  }

  // 3. Look up adapter
  const adapter = registry.get(sourceType)
  if (!adapter) {
    res.status(404).json({ error: `No adapter registered for source type: ${sourceType}` })
    return
  }

  // 4. Parse the payload via the adapter
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

  // 5. Normalize the parsed notification
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

  // 6. Write to Firestore with auto-generated ID
  try {
    await db.collection("notifications").add(notificationData)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error("Firestore write error", { sourceType, error: message })
    res.status(500).json({ error: "Failed to write notification to database" })
    return
  }

  // 7. Respond with HTTP 200
  res.status(200).json({ success: true })
})
