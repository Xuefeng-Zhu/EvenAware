/**
 * Webhook URL construction for integrations.
 */

/** Build the full webhook URL for a given source type. */
export function buildWebhookUrl(sourceType: string): string {
  const baseUrl = import.meta.env.VITE_FUNCTIONS_BASE_URL
  return `${baseUrl}/handleWebhook/webhooks/${sourceType}`
}
