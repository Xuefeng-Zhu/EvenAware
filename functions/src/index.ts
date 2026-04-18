/**
 * Notification Hub — Firebase Cloud Functions entry point.
 *
 * Exports the webhook handler that receives notifications from external
 * sources (PagerDuty, OpsGenie, etc.), normalizes them via pluggable
 * source adapters, and writes them to Firestore.
 */

export { handleWebhook } from "./webhook.js"
